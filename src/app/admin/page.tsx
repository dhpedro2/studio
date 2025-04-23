"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import '@/app/globals.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function Admin() {
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is an admin
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true);
          fetchPendingDeposits();
        } else {
          setIsAdmin(false);
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta página.",
          });
          router.push("/dashboard"); // Redirect non-admin users
        }
        setLoading(false);
      } else {
        router.push("/"); // Redirect if not logged in
      }
    });

    return () => unsubscribe();
  }, [auth, db, router, toast]);

  const fetchPendingDeposits = async () => {
    setLoading(true);
    try {
      const pendingDepositsCollection = collection(db, "pendingDeposits");
      const q = query(pendingDepositsCollection, where("status", "==", "pending"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const deposits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingDeposits(deposits);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar depósitos pendentes",
        description: error.message,
      });
    }
    setLoading(false);
  };

  const approveDeposit = async (depositId: string, userId: string, amount: number) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não encontrado.",
        });
        return;
      }

      //Update deposit status and move to approved deposits
      const depositDocRef = doc(db, "pendingDeposits", depositId);
      const depositData = (await getDoc(depositDocRef)).data();

      await updateDoc(depositDocRef, { status: "approved" });

      const approvedDepositsCollection = collection(db, "approvedDeposits");
      await addDoc(approvedDepositsCollection, depositData);

      //Delete the document from pendingDeposits
      await deleteDoc(depositDocRef);
      
      const currentBalance = userDoc.data().saldo || 0;
      await updateDoc(userDocRef, { saldo: currentBalance + amount });

      toast({
        title: "Depósito aprovado com sucesso!",
        description: `Z${amount} foi adicionado à conta do usuário.`,
      });
      fetchPendingDeposits(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar depósito",
        description: error.message,
      });
    }
    setLoading(false);
  };

    const rejectDeposit = async (depositId: string, userId: string, amount: number) => {
        setLoading(true);
        try {
            const depositDocRef = doc(db, "pendingDeposits", depositId);
            const depositData = (await getDoc(depositDocRef)).data();

             //Update deposit status and move to rejected deposits
            await updateDoc(depositDocRef, { status: "rejected" });

            const rejectedDepositsCollection = collection(db, "rejectedDeposits");
            await addDoc(rejectedDepositsCollection, depositData);

            //Delete the document from pendingDeposits
            await deleteDoc(depositDocRef);

            toast({
                title: "Depósito rejeitado com sucesso!",
                description: `O depósito de Z${amount} do usuário foi rejeitado.`,
            });
            fetchPendingDeposits(); // Refresh the list
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao rejeitar depósito",
                description: error.message,
            });
        }
        setLoading(false);
    };
        const deleteDoc = async (docRef: any) => {
            await deleteDoc(docRef);
        };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Skeleton className="w-64 h-10 mb-4" />
        <Skeleton className="w-96 h-12 mb-2" />
        <Skeleton className="w-96 h-12 mb-2" />
        <Skeleton className="w-96 h-12 mb-2" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => router.push("/dashboard")}>Voltar ao Painel</Button>
      </div>
    );
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
          Zaca Bank - Admin Panel
        </h1>
      </div>
      {/* Navigation Buttons */}
      <div className="flex justify-around w-full max-w-md mb-8 z-20">
        <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-2" />Início</Button>
        <Button onClick={() => router.push("/transfer")} variant="ghost" className="md:text-sm"><Wallet className="mr-2" />Transferências</Button>
        <Button onClick={() => router.push("/history")} variant="ghost" className="md:text-sm"><Clock className="mr-2" />Histórico</Button>
        <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-2" />Perfil</Button>
      </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <Card className="w-full max-w-2xl z-20">
        <CardHeader>
          <CardTitle>Depósitos Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="main-content">
          {pendingDeposits.length === 0 ? (
            <p>Nenhum depósito pendente.</p>
          ) : (
            <div className="grid gap-4">
              {pendingDeposits.map((deposit) => (
                <Card key={deposit.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Depósito de Z&#x24E6; {deposit.amount}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Usuário ID: {deposit.userId}</p>
                    <p>Data: {format(new Date(deposit.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <Button asChild variant="link">
                        <a href={deposit.fileURL} target="_blank" rel="noopener noreferrer">
                            Ver Comprovante
                        </a>
                    </Button>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => approveDeposit(deposit.id, deposit.userId, deposit.amount)}>Aprovar</Button>
                      <Button variant="destructive" onClick={() => rejectDeposit(deposit.id, deposit.userId, deposit.amount)}>Rejeitar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
