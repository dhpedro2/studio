
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
  doc,
  Timestamp,
  or
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
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

const app = initializeApp(firebaseConfig);
const BANK_ADMIN_USER_ID = "ZACA_BANK_ADMIN_SYSTEM";


interface Transaction {
  id: string;
  remetente: string; // UID of sender
  destinatario: string; // UID of recipient
  valor: number;
  data: string | Timestamp; // Keep as string for Firestore compatibility, convert on client
  remetenteNome?: string;
  destinatarioNome?: string;
  adminAction?: boolean;
  tipo?: string; // e.g., 'transferencia', 'admin_deposit_saldo', 'admin_withdrawal_saldo'
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string>("Você");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDocs(query(collection(db, "users"), where("email", "==", user.email))); // Not ideal, but for prototype
        if (!userDocSnap.empty) {
            setCurrentUserFullName(userDocSnap.docs[0].data().fullName || "Você");
        }
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [auth, router, db]);

  useEffect(() => {
    const loadTransactions = async () => {
        if (!currentUserId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const transactionsCollectionRef = collection(db, "transactions");
            const userTransactionsQuery = query(
                transactionsCollectionRef,
                or(
                    where("remetente", "==", currentUserId),
                    where("destinatario", "==", currentUserId)
                ),
                orderBy("data", "desc")
            );

            const querySnapshot = await getDocs(userTransactionsQuery);
            const transactionList: Transaction[] = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as Transaction));
            
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

    if (currentUserId) {
        loadTransactions();
    }
  }, [currentUserId, db, toast]);


  useEffect(() => {
    let filtered = [...transactions];

    if (startDate) {
        const start = startOfDay(startDate);
        filtered = filtered.filter(transaction => {
            const transactionDate = transaction.data instanceof Timestamp ? transaction.data.toDate() : parseISO(transaction.data as string);
            return transactionDate >= start;
        });
    }
    if (endDate) {
        const end = endOfDay(endDate);
        filtered = filtered.filter(transaction => {
            const transactionDate = transaction.data instanceof Timestamp ? transaction.data.toDate() : parseISO(transaction.data as string);
            return transactionDate <= end;
        });
    }


    if (typeFilter !== "todos" && currentUserId) {
      filtered = filtered.filter(transaction => {
        if (typeFilter === "entrada") {
          return transaction.destinatario === currentUserId;
        } else if (typeFilter === "saída") {
          return transaction.remetente === currentUserId;
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
  }, [transactions, startDate, endDate, typeFilter, minValue, maxValue, currentUserId]);

  const getFormattedDate = (data: string | Timestamp): string => {
    const date = data instanceof Timestamp ? data.toDate() : parseISO(data as string);
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTransactionPartyName = (transaction: Transaction, perspective: 'remetente' | 'destinatario'): string => {
    if (transaction.adminAction) {
        return "Banco";
    }
    if (perspective === 'remetente') {
        return transaction.remetente === currentUserId ? currentUserFullName : transaction.remetenteNome || "Desconhecido";
    }
    // perspective === 'destinatario'
    return transaction.destinatario === currentUserId ? currentUserFullName : transaction.destinatarioNome || "Desconhecido";
  };


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
      <div className="flex justify-center items-center py-4 z-20">
        <h1 className="text-4xl font-semibold text-purple-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
          Zaca Bank
        </h1>
      </div>
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
                    {transaction.remetente === currentUserId
                      ? `Enviado para: ${getTransactionPartyName(transaction, 'destinatario')}`
                      : `Recebido de: ${getTransactionPartyName(transaction, 'remetente')}`}
                  </p>
                  <p className={`md:text-sm font-bold ${transaction.destinatario === currentUserId ? 'text-green-600' : 'text-red-600'}`}>
                    Valor: Ƶ {transaction.valor.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data: {getFormattedDate(transaction.data)}
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
