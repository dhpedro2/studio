"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Chart,
  ChartBar,
  ChartBarSeries,
  ChartCategoryAxis,
  ChartLegend,
  ChartValueAxis,
} from "@mui/x-charts";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { alpha, styled } from "@mui/material/styles";

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
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  useEffect(() => {
    const loadTransactions = async () => {
      if (!auth.currentUser) {
        return;
      }
  
      const userId = auth.currentUser.uid;
      const transactionsCollection = collection(db, "transactions");
  
      // Query transactions where the user is either the sender OR the recipient
      const q = query(
        transactionsCollection,
        where("remetente", "==", userId)
      );
  
      const q2 = query(
        transactionsCollection,
        where("destinatario", "==", userId)
      );
  
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(q2)
      ]);
  
      const transactionList: Transaction[] = [];
  
      // Helper function to fetch user name
      const fetchUserName = async (userId: string) => {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          return userDoc.data().name;
        }
        return "Nome Desconhecido";
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
    };
  
    loadTransactions();
  }, [auth.currentUser, db]);

  // Prepare data for the chart
  const chartData = Object.entries(transactionFrequency).map(([date, count]) => ({
    date,
    count,
  }));

  interface valueType {
    date: string;
    count: number;
  }

  const StyledChartBar = styled(ChartBar)(({ theme }) => ({
    borderRadius: 3,
    ...(theme.palette.mode === 'dark'
      ? {
          fill: '#fff',
        }
      : {
          fill: '#1A2027',
        }),
  }));

  const RadarChartBackground = () => {
    const { width, height, cx, cy } = useDrawingArea();
    const grey = '#D8D8D8';
    return (
      <g>
        <circle cx={cx} cy={cy} r={height * 0.4} stroke={grey} strokeWidth={1} fill="none" />
        <circle cx={cx} cy={cy} r={height * 0.6} stroke={grey} strokeWidth={1} fill="none" />
        <circle cx={cx} cy={cy} r={height * 0.8} stroke={grey} strokeWidth={1} fill="none" />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary py-8">
      {/* Navigation Buttons */}
      <div className="flex justify-around w-full max-w-md mb-8">
        <Button onClick={() => router.push("/")} variant="ghost"><Home className="mr-2" />Início</Button>
        <Button onClick={() => router.push("/transfer")} variant="ghost"><Wallet className="mr-2" />Transferências</Button>
        <Button onClick={() => router.push("/history")} variant="ghost"><Clock className="mr-2" />Histórico</Button>
        <Button onClick={() => router.push("/profile")} variant="ghost"><User className="mr-2" />Perfil</Button>
      </div>
      <Separator className="w-full max-w-md mb-8" />

      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle>Estatísticas do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-lg font-semibold">
              Total Transferido: R$ {totalAmountTransferred.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold">
              Número de Transações: {transactions.length}
            </p>
          </div>
          <div>
             <Chart
                xAxis={[{ scaleType: 'band', dataKey: 'date' }]}
                yAxis={[{}]}
                series={[{ type: 'bar', dataKey: 'count' }]}
                dataset={chartData}
                width={500}
                height={300}
              />
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}
