"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();

  useEffect(() => {
    const loadTransactions = async () => {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const transactionsCollection = collection(db, "transactions");

        // Query transactions where the user is either the sender or the recipient
        const q = query(
          transactionsCollection,
          where("remetente", "==", userId),
          orderBy("data", "desc")
        );

        const querySnapshot = await getDocs(q);

        const transactionList: Transaction[] = [];

        // Process sender transactions
        querySnapshot.forEach(async (doc) => {
          const data = doc.data();
          const remetenteNome = data.remetenteNome || "Unknown Sender";
          const destinatarioNome = data.destinatarioNome || "Unknown Receiver";
          transactionList.push({
            id: doc.id,
            remetente: data.remetente,
            destinatario: data.destinatario,
            valor: data.valor,
            data: data.data,
            remetenteNome: remetenteNome,
            destinatarioNome: destinatarioNome,
          });
        });
        
        const q2 = query(
          transactionsCollection,
          where("destinatario", "==", userId),
          orderBy("data", "desc")
        );

        const querySnapshot2 = await getDocs(q2);

        querySnapshot2.forEach(async (doc) => {
          const data = doc.data();
          const remetenteNome = data.remetenteNome || "Unknown Sender";
          const destinatarioNome = data.destinatarioNome || "Unknown Receiver";
          transactionList.push({
            id: doc.id,
            remetente: data.remetente,
            destinatario: data.destinatario,
            valor: data.valor,
            data: data.data,
            remetenteNome: remetenteNome,
            destinatarioNome: destinatarioNome,
          });
        });

        transactionList.sort((a, b) => (b.data > a.data ? 1 : -1));

        setTransactions(transactionList);
      }
    };

    loadTransactions();
  }, [auth.currentUser, db]);

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
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {transactions.length > 0 ? (
            <ul className="space-y-2">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="border rounded-md p-2 bg-muted"
                >
                  <p>
                    {transaction.remetente === auth.currentUser?.uid
                      ? `Enviado para: ${transaction.destinatarioNome}`
                      : `Recebido de: ${transaction.remetenteNome}`}
                  </p>
                  <p>
                    Valor: R$ {transaction.valor.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data: {transaction.data}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma transação encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
