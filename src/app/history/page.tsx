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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<"entrada" | "saída" | "todos">("todos");
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const loadTransactions = async () => {
      if (!auth.currentUser) {
        return;
      }

      const userId = auth.currentUser.uid;
      const transactionsCollection = collection(db, "transactions");

      const sentQuery = query(
        transactionsCollection,
        where("remetente", "==", userId),
        orderBy("data", "desc")
      );

      const receivedQuery = query(
        transactionsCollection,
        where("destinatario", "==", userId),
        orderBy("data", "desc")
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const transactionList: Transaction[] = [];

      const fetchUserName = async (userId: string) => {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          return userDoc.data().name;
        }
        return "Nome Desconhecido";
      };

      for (const doc of sentSnapshot.docs) {
        const data = doc.data();
        const destinatarioNome = await fetchUserName(data.destinatario);
        transactionList.push({
          id: doc.id,
          remetente: data.remetente,
          destinatario: data.destinatario,
          valor: data.valor,
          data: data.data,
          remetenteNome: "Você",
          destinatarioNome: destinatarioNome,
        });
      }

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
          destinatarioNome: "Você",
        });
      }

      transactionList.sort((a, b) => (parseISO(b.data).getTime() - parseISO(a.data).getTime()));
      setTransactions(transactionList);
    };

    loadTransactions();
  }, [auth.currentUser, db]);

  useEffect(() => {
    let filtered = [...transactions];

    if (startDate && endDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = parseISO(transaction.data);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    if (typeFilter !== "todos") {
      filtered = filtered.filter(transaction => {
        if (typeFilter === "entrada") {
          return transaction.destinatario === auth.currentUser?.uid;
        } else if (typeFilter === "saída") {
          return transaction.remetente === auth.currentUser?.uid;
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
  }, [transactions, startDate, endDate, typeFilter, minValue, maxValue, auth.currentUser?.uid]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary py-8">
      {/* Navigation Buttons */}
      <div className="flex justify-around w-full max-w-md mb-8">
        <Button onClick={() => router.push("/dashboard")} variant="ghost"><Home className="mr-2" />Início</Button>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate">Data Inicial:</Label>
              <Input
                type="date"
                id="startDate"
                onChange={(e) => setStartDate(e.target.value ? parseISO(e.target.value) : null)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final:</Label>
              <Input
                type="date"
                id="endDate"
                onChange={(e) => setEndDate(e.target.value ? parseISO(e.target.value) : null)}
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minValue">Valor Mínimo:</Label>
              <Input
                type="number"
                id="minValue"
                placeholder="Mínimo"
                onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <Label htmlFor="maxValue">Valor Máximo:</Label>
              <Input
                type="number"
                id="maxValue"
                placeholder="Máximo"
                onChange={(e) => setMaxValue(e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <ul className="space-y-2">
              {filteredTransactions.map((transaction) => (
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
                    Data: {format(parseISO(transaction.data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
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
