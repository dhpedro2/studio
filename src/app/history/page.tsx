"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import '@/app/globals.css';

const firebaseConfig = {
  apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA",
  authDomain: "bank-dh.firebaseapp.com",
  projectId: "bank-dh",
  storageBucket: "bank-dh.firebasestorage.app",
  messagingSenderId: "370634468884",
  appId: "1:370634468884:web:4a00ea2f9757051cda4101",
  measurementId: "G-JPFXDJBSGM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const BANK_ADMIN_USER_ID = "ZACA_BANK_ADMIN_SYSTEM";


interface Transaction {
  id: string;
  remetente: string;
  destinatario: string;
  valor: number;
  data: string;
  remetenteNome?: string; // Made optional as it might be "Banco"
  destinatarioNome?: string; // Made optional as it might be "Banco"
  adminAction?: boolean; // Flag for admin actions
}

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<"entrada" | "saída" | "todos">("todos");
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadTransactions(user.uid);
      } else {
        router.push("/");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth, router]);


  const loadTransactions = async (userId: string) => {
    setLoading(true);
    if (!userId) {
      setLoading(false);
      return;
    }

    const transactionsCollection = collection(db, "transactions");

    // Query for transactions where the user is the sender
    const sentQuery = query(
      transactionsCollection,
      where("remetente", "==", userId),
      orderBy("data", "desc")
    );

    // Query for transactions where the user is the recipient
    const receivedQuery = query(
      transactionsCollection,
      where("destinatario", "==", userId),
      orderBy("data", "desc")
    );
    
    // Query for admin actions involving the user (either as recipient of deposit or sender of withdrawal)
    const adminToUserQuery = query(
      transactionsCollection,
      where("destinatario", "==", userId),
      where("adminAction", "==", true),
      orderBy("data", "desc")
    );
    const userToAdminQuery = query(
      transactionsCollection,
      where("remetente", "==", userId),
      where("adminAction", "==", true),
      orderBy("data", "desc")
    );


    try {
      const [sentSnapshot, receivedSnapshot, adminToUserSnapshot, userToAdminSnapshotResolved] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery),
        getDocs(adminToUserQuery),
        getDocs(userToAdminQuery), // Corrected: use userToAdminQuery here
      ]);

      const transactionList: Transaction[] = [];
      const processedIds = new Set<string>(); // To avoid duplicate transactions

      const fetchUserName = async (uid: string): Promise<string> => {
        if (uid === BANK_ADMIN_USER_ID) {
          return "Banco";
        }
        try {
          const userDocRef = doc(db, "users", uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            return userDocSnap.data().name || "Usuário Desconhecido";
          }
          return "Usuário Desconhecido";
        } catch (error) {
          console.error("Erro ao buscar nome do usuário:", error);
          return "Erro ao buscar nome";
        }
      };
      
      const processDoc = async (docSnap: any, currentUserId: string) => {
          if (processedIds.has(docSnap.id)) return;
          processedIds.add(docSnap.id);

          const data = docSnap.data() as Transaction;
          let remetenteNome = data.remetente === currentUserId ? "Você" : await fetchUserName(data.remetente);
          let destinatarioNome = data.destinatario === currentUserId ? "Você" : await fetchUserName(data.destinatario);

          if (data.adminAction) {
              if (data.remetente === BANK_ADMIN_USER_ID) { 
                  remetenteNome = "Banco";
                  destinatarioNome = data.destinatario === currentUserId ? "Você" : await fetchUserName(data.destinatario);
              } else { 
                  remetenteNome = data.remetente === currentUserId ? "Você" : await fetchUserName(data.remetente);
                  destinatarioNome = "Banco";
              }
          }


          transactionList.push({
              id: docSnap.id,
              ...data,
              remetenteNome,
              destinatarioNome,
          });
      };


      // Process normal sent transactions (excluding admin withdrawals initiated by user)
      for (const docSnap of sentSnapshot.docs) {
          if (!docSnap.data().adminAction || docSnap.data().remetente === userId) {
               await processDoc(docSnap, userId);
          }
      }
      // Process normal received transactions (excluding admin deposits initiated for user)
      for (const docSnap of receivedSnapshot.docs) {
           if (!docSnap.data().adminAction || docSnap.data().destinatario === userId) {
              await processDoc(docSnap, userId);
           }
      }
      // Process admin deposits to the user
      for (const docSnap of adminToUserSnapshot.docs) {
          await processDoc(docSnap, userId);
      }
      // Process admin withdrawals from the user
      for (const docSnap of userToAdminSnapshotResolved.docs) {
          await processDoc(docSnap, userId);
      }


      transactionList.sort((a, b) => (parseISO(b.data).getTime() - parseISO(a.data).getTime()));
      setTransactions(transactionList);

    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar histórico",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let filtered = [...transactions];

    if (startDate && endDate) {
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setHours(23, 59, 59, 999); // Make endDate inclusive
      filtered = filtered.filter(transaction => {
        const transactionDate = parseISO(transaction.data);
        return transactionDate >= startDate && transactionDate <= inclusiveEndDate;
      });
    }

    if (typeFilter !== "todos" && currentUser) {
      filtered = filtered.filter(transaction => {
        if (typeFilter === "entrada") {
          return transaction.destinatario === currentUser!.uid;
        } else if (typeFilter === "saída") {
          return transaction.remetente === currentUser!.uid;
        }
        return true; 
      });
    }
    

    if (minValue !== null) {
      filtered = filtered.filter(transaction => transaction.valor >= minValue);
    }

    if (maxValue !== null) {
      filtered = filtered.filter(transaction => transaction.valor <= maxValue);
    }

    setFilteredTransactions(filtered);
  }, [transactions, startDate, endDate, typeFilter, minValue, maxValue, currentUser]);

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen py-8">
      <video
        src="https://static.moewalls.com/videos/preview/2023/pink-wave-sunset-preview.webm"
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10"/>
        <div className="flex justify-center items-center py-4">
        <h1 className="text-4xl font-semibold text-purple-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
          Zaca Bank
        </h1>
      </div>
      {/* Navigation Buttons */}
      <div className="flex justify-around w-full max-w-md mb-8 z-20 mobile-nav-buttons">
        <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Início</span></Button>
        <Button onClick={() => router.push("/transfer")} variant="ghost" className="md:text-sm"><Wallet className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Transferências</span></Button>
        <Button onClick={() => router.push("/history")} variant="ghost" className="md:text-sm"><Clock className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Histórico</span></Button>
        <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Perfil</span></Button>
      </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <Card className="w-full max-w-md z-20 md:w-96">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center md:text-left">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 main-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate">Data Inicial:</Label>
              <Input
                type="date"
                id="startDate"
                onChange={(e) => setStartDate(e.target.value ? parseISO(e.target.value) : null)}
                className="md:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final:</Label>
              <Input
                type="date"
                id="endDate"
                onChange={(e) => setEndDate(e.target.value ? parseISO(e.target.value) : null)}
                className="md:text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="typeFilter">Tipo:</Label>
            <select
              id="typeFilter"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => setTypeFilter(e.target.value as "entrada" | "saída" | "todos")}
              defaultValue="todos"
            >
              <option value="todos">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saída">Saída</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minValue">Valor Mínimo:</Label>
              <Input
                type="number"
                id="minValue"
                placeholder="Mínimo"
                onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
                className="md:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="maxValue">Valor Máximo:</Label>
              <Input
                type="number"
                id="maxValue"
                placeholder="Máximo"
                onChange={(e) => setMaxValue(e.target.value ? parseFloat(e.target.value) : null)}
                className="md:text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="border rounded-md p-3 bg-muted shadow-sm" 
                >
                  <p className="font-semibold">
                    {transaction.remetente === currentUser?.uid
                      ? `Enviado para: ${transaction.destinatarioNome}`
                      : `Recebido de: ${transaction.remetenteNome}`}
                  </p>
                  <p className={`md:text-sm font-bold ${transaction.destinatario === currentUser?.uid ? 'text-green-600' : 'text-red-600'}`}>
                    Valor: Ƶ {transaction.valor.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data: {format(parseISO(transaction.data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground">Nenhuma transação encontrada com os filtros aplicados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


