"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
  } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
initializeApp(firebaseConfig);

interface Transaction {
  id: string;
  remetente: string;
  destinatario: string;
  valor: number;
  data: string;
  remetenteNome: string;
  destinatarioNome: string;
}

export default function Profile() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmountTransferred, setTotalAmountTransferred] = useState<number>(0);
  const [transactionFrequency, setTransactionFrequency] = useState<any>({});
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null); // New state for account creation date
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe;

    const loadTransactions = async () => {
      setLoading(true);
      if (!auth.currentUser) {
        return;
      }

      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setName(userDoc.data().name || null);
        setEmail(userDoc.data().email || null);
        setCreatedAt(userDoc.data().createdAt || null); // Get account creation date
      }

      const transactionsCollection = collection(db, "transactions");
  
      // Query transactions where the user is either the sender OR the recipient
      const sentQuery = query(
        transactionsCollection,
        where("remetente", "==", userId)
      );
  
      const q2 = query(
        transactionsCollection,
        where("destinatario", "==", userId)
      );
  
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(q2)
      ]);
  
      const transactionList: Transaction[] = [];
  
      // Helper function to fetch user name
      const fetchUserName = async (userId: string) => {
         try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            return userDoc.data().name;
          }
          return "Nome Desconhecido";
        } catch (error) {
          console.error("Erro ao buscar nome do usuário:", error);
          return "Nome Desconhecido";
        }
      };
  
      // Process sent transactions
      for (const doc of sentSnapshot.docs) {
        const data = doc.data();
        const destinatarioNome = await fetchUserName(data.destinatario);
        transactionList.push({
          id: doc.id,
          remetente: data.remetente,
          destinatario: data.destinatario,
          valor: data.valor,
          data: data.data,
          remetenteNome: "Você", // Sender is the current user
          destinatarioNome: destinatarioNome,
        });
      }
  
      // Process received transactions
      for (const doc of receivedSnapshot.docs) {
        const data = doc.data();
        const remetenteNome = await fetchUserName(data.remetente);
        transactionList.push({
          id: doc.id,
          remetente: data.remetente,
          destinatario: data.destinatario,
          valor: data.valor,
          data: data.data,
          remetenteNome: remetenteNome,
          destinatarioNome: "Você", // Recipient is the current user
        });
      }
  
      transactionList.sort((a, b) => (b.data > a.data ? 1 : -1));
      setTransactions(transactionList);

      // Calculate total amount transferred
      const totalTransferred = transactionList.reduce((total, transaction) => {
        return total + transaction.valor;
      }, 0);
      setTotalAmountTransferred(totalTransferred);

      // Calculate transaction frequency
      const frequency: { [key: string]: number } = {};
      transactionList.forEach(transaction => {
        const date = format(new Date(transaction.data), 'yyyy-MM-dd');
        frequency[date] = (frequency[date] || 0) + 1;
      });
      setTransactionFrequency(frequency);
       setLoading(false);
    };
  
    loadTransactions();

     return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
  }, [auth.currentUser, db]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
      toast({
        title: "Logout realizado com sucesso!",
        description: "Redirecionando para a página inicial...",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar o logout",
        description: error.message,
      });
    }
  };


  // Prepare data for the chart
  const chartData = Object.entries(transactionFrequency).map(([date, count]) => ({
    date,
    count,
  }));

  interface valueType {
    date: string;
    count: number;
  }

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen py-8" style={{
      backgroundImage: `url('https://static.moewalls.com/videos/preview/2023/pink-wave-sunset-preview.webm')`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }}>
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
          DH Bank
        </h1>
      </div>
      {/* Navigation Buttons */}
      <div className="flex justify-around w-full max-w-md mb-8 z-20">
        <Button onClick={() => router.push("/dashboard")} variant="ghost"><Home className="mr-2" />Início</Button>
        <Button onClick={() => router.push("/transfer")} variant="ghost"><Wallet className="mr-2" />Transferências</Button>
        <Button onClick={() => router.push("/history")} variant="ghost"><Clock className="mr-2" />Histórico</Button>
        <Button onClick={() => router.push("/profile")} variant="ghost"><User className="mr-2" />Perfil</Button>
      </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <Card className="w-96 z-20">
        <CardHeader className="space-y-1">
          <CardTitle>Estatísticas do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-4">
             <Avatar>
                 {loading ? (
                     <Skeleton className="h-10 w-10 rounded-full"/>
                 ) : (
                 <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                 )}
              </Avatar>
            <div>
              <p className="text-lg font-semibold">
                Nome: {loading ? <Skeleton width={120} /> : (name || "Carregando...")}
              </p>
              <p className="text-lg font-semibold">
                Email: {loading ? <Skeleton width={160} /> : (email || "Carregando...")}
              </p>
            </div>
           

            <Button onClick={handleLogout} variant="destructive">
              <Settings className="mr-2" />
              Sair
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-4">Valor Total Transferido: R$ {loading ? <Skeleton width={100}/> : totalAmountTransferred.toFixed(2)}</h2>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-4">Frequência de Transações</h2>
            {loading ? (
                <Skeleton className="w-full h-32"/>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>Nenhuma transação encontrada para exibir o gráfico.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

