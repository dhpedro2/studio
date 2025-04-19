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
  getDoc,
  doc,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
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
initializeApp(firebaseConfig);

interface RecentTransfer {
  destinatario: string;
  destinatarioNome: string;
  destinatarioEmail: string;
}

export default function TransferenciasAntigas() {
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      if (!auth.currentUser) {
        return;
      }

      const userId = auth.currentUser.uid;
      const transactionsCollection = collection(db, "transactions");

      const sentQuery = query(
        transactionsCollection,
        where("remetente", "==", userId)
      );

      const querySnapshot = await getDocs(sentQuery);

    const transferMap: { [destinatario: string]: RecentTransfer } = {};

      for (const doc of querySnapshot.docs) {
        const data = doc.data();

         try {
          const recipientDoc = await getDoc(doc(db, "users", data.destinatario));
            if (recipientDoc.exists()) {
              const recipientData = recipientDoc.data();
              const destinatario = data.destinatario;

            if (!transferMap[destinatario]) {
              transferMap[destinatario] = {
                destinatario: data.destinatario,
                destinatarioNome: recipientData?.name || "Nome Desconhecido",
                destinatarioEmail: recipientData?.email || "Email Desconhecido",
              };
            }
           }
           } catch (error) {
            console.error("Erro ao buscar nome do usuário:", error);
              toast({
                 variant: "destructive",
                 title: "Erro",
                 description: "Erro ao buscar informações do destinatário.",
               });
           }
      }

       // Convert the map to an array
       const transferList = Object.values(transferMap);
       setRecentTransfers(transferList);
       setLoading(false);
     };

    loadTransactions();
  }, [auth.currentUser, db, toast]);

  const handleSelectRecipient = (email: string) => {
    router.push(`/transfer?email=${email}`);
  };

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
        <h1 className="text-4xl font-semibold text-blue-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
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
          <CardTitle>Transferências Recentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
              <Skeleton className="w-full h-10 mb-2" />
            </div>
          ) : recentTransfers.length > 0 ? (
            <ul className="space-y-2">
              {recentTransfers.map((transfer) => (
                <li key={transfer.destinatario}>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSelectRecipient(transfer.destinatarioEmail)}
                  >
                    {transfer.destinatarioNome} ({transfer.destinatarioEmail})
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma transferência recente encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
