"use client";

import { useEffect, useState } from "react";
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

interface Transaction {
  id: string;
  remetente: string;
  destinatario: string;
  valor: number;
  data: string;
}

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const loadTransactions = async () => {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const transactionsCollection = collection(db, "transactions");

        const q = query(
          transactionsCollection,
          where("remetente", "==", userId),
          orderBy("data", "desc")
        );

        const querySnapshot = await getDocs(q);
        const transactionList: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          transactionList.push({
            id: doc.id,
            remetente: data.remetente,
            destinatario: data.destinatario,
            valor: data.valor,
            data: data.data,
          });
        });
        setTransactions(transactionList);
      }
    };

    loadTransactions();
  }, [auth.currentUser, db]);

  return (
    <div className="flex items-center justify-center h-screen bg-secondary">
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
                    Destinatário: {transaction.destinatario}
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
