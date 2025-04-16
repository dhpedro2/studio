"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeApp } from "firebase/app";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA",
  authDomain: "bank-dh.firebaseapp.com",
  projectId: "bank-dh",
  storageBucket: "bank-dh.firebasestorage.app",
  messagingSenderId: "370634468884",
  appId: "1:370634468884:web:4a00ea2f9757051cda4101",
  measurementId: "G-JPFXDJBSGM",
};

export default function Dashboard() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addRemoveAmount, setAddRemoveAmount] = useState<string>("");
  const router = useRouter();
  const { toast } = useToast();

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
          setSaldo(docSnap.data().saldo || 0);
          setIsAdmin(docSnap.data().isAdmin || false);
        } else {
          console.log("No such document!");
          setSaldo(0);
          setIsAdmin(false);
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [auth, db, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      }
    };

    fetchUsers();
  }, [isAdmin, db]);

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

  const handleAddRemoveSaldo = async () => {
    if (!selectedUserId || !addRemoveAmount) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um usuário e insira um valor.",
      });
      return;
    }

    const amount = parseFloat(addRemoveAmount);
    if (isNaN(amount)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um valor válido.",
      });
      return;
    }

    try {
      const userDocRef = doc(db, "users", selectedUserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const currentSaldo = userDoc.data().saldo || 0;
        const newSaldo = currentSaldo + amount;

        await updateDoc(userDocRef, {
          saldo: newSaldo,
        });

        toast({
          title: "Saldo atualizado com sucesso!",
          description: `Saldo de ${userDoc.data().name} atualizado para R$ ${newSaldo.toFixed(2)}.`,
        });
        setAddRemoveAmount("");
        // Refresh users list
        const fetchUsers = async () => {
          if (isAdmin) {
            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setUsers(usersList);
          }
        };
    
        fetchUsers();

      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não encontrado.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar o saldo",
        description: error.message,
      });
    }
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
          <CardTitle>Painel do Usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-lg font-semibold">
              Saldo Atual: R$ {saldo !== null ? saldo.toFixed(2) : "Carregando..."}
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button onClick={() => router.push("/transfer")}>
              Realizar Transferência
            </Button>
            <Button onClick={() => router.push("/history")}>
              Histórico de Transações
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="w-96 mt-8">
          <CardHeader className="space-y-1">
            <CardTitle>Painel de Administração</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="user">Selecione um usuário:</Label>
              <select
                id="user"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Selecione</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - R$ {user.saldo ? user.saldo.toFixed(2) : '0.00'}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Adicionar/Remover Saldo:</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Valor"
                value={addRemoveAmount}
                onChange={(e) => setAddRemoveAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleAddRemoveSaldo}>Atualizar Saldo</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
