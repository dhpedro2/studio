
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
  deleteDoc as deleteFirestoreDoc // Renamed to avoid conflict
} from "firebase/firestore";
// Removed getStorage and ref as they are not used for image preview here
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import '@/app/globals.css';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const firebaseConfig = {
  apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA",
  authDomain: "bank-dh.firebaseapp.com",
  projectId: "bank-dh",
  storageBucket: "bank-dh.firebasestorage.app",
  messagingSenderId: "370634468884",
  appId: "1:370634468884:web:4a00ea2f9757051cda4101",
  measurementId: "G-JPFXDJBSGM",
};

initializeApp(firebaseConfig);

interface UserData {
  id: string;
  fullName?: string;
  callNumber?: number;
  email?: string; // dummy email
  saldo?: number;
  saldoCaixinha?: number;
  [key: string]: any; // For other fields
}

interface PendingDeposit {
    id: string;
    userId: string;
    userCallNumber?: number; // Added to display
    userFullName?: string; // Added to display
    amount: number;
    date: any; // Firestore Timestamp or string
    fileURL?: string; // Optional, if you store it
    status: string;
}


export default function Admin() {
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserData | null>(null);
  const [addRemoveAmount, setAddRemoveAmount] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(true);
  const [selectedBalanceType, setSelectedBalanceType] = useState<"saldo" | "saldoCaixinha">("saldo");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin) {
          setIsAdmin(true);
          fetchPendingDeposits();
          fetchUsers();
        } else {
          setIsAdmin(false);
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta página.",
          });
          router.push("/dashboard");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, router, toast]);

  const fetchUsers = async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as UserData));
      setUsers(usersList);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message,
      });
    }
  };

  const fetchPendingDeposits = async () => {
    setLoading(true);
    try {
      const pendingDepositsCollection = collection(db, "pendingDeposits");
      const q = query(pendingDepositsCollection, where("status", "==", "pending"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      
      const depositsPromises = querySnapshot.docs.map(async (docSnap) => {
        const depositData = docSnap.data();
        const userDocRef = doc(db, "users", depositData.userId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        return {
          id: docSnap.id,
          ...depositData,
          userCallNumber: userData.callNumber,
          userFullName: userData.fullName,
        } as PendingDeposit;
      });
      const deposits = await Promise.all(depositsPromises);
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

  useEffect(() => {
    if (selectedUser) {
      const userDetail = users.find(u => u.id === selectedUser);
      setSelectedUserDetails(userDetail || null);
    } else {
      setSelectedUserDetails(null);
    }
  }, [selectedUser, users]);


  const handleAddRemoveBalance = async () => {
    if (!selectedUser || !addRemoveAmount) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione um usuário e insira um valor." });
      return;
    }
    const value = parseFloat(addRemoveAmount);
    if (isNaN(value) || value <=0) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, insira um valor numérico positivo válido." });
      return;
    }

    try {
      const userDocRef = doc(db, "users", selectedUser);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        toast({ variant: "destructive", title: "Erro", description: "Usuário não encontrado." });
        return;
      }

      const currentBalanceValue = userDocSnap.data()?.[selectedBalanceType] || 0;
      let newBalance;
      if (isAdding) {
        newBalance = currentBalanceValue + value;
      } else {
        if (currentBalanceValue < value) {
          toast({ variant: "destructive", title: "Operação Inválida", description: `Não é possível remover Ƶ${value.toFixed(2)}. Saldo atual do usuário (${selectedBalanceType}) é Ƶ${currentBalanceValue.toFixed(2)}.` });
          return;
        }
        newBalance = currentBalanceValue - value;
      }
      
      await updateDoc(userDocRef, { [selectedBalanceType]: newBalance });
      toast({ title: "Sucesso", description: `Saldo ${isAdding ? "adicionado" : "removido"} com sucesso.` });
      
      setAddRemoveAmount("");
      fetchUsers(); // Refresh users list to update displayed balances
      // Also refresh selectedUserDetails if the current selectedUser is being modified
      if (selectedUserDetails && selectedUserDetails.id === selectedUser) {
        const updatedUser = users.find(u => u.id === selectedUser);
         if(updatedUser) { // Fetch the updated details again
            const freshUserDoc = await getDoc(userDocRef);
            if (freshUserDoc.exists()) {
                 setSelectedUserDetails({id: freshUserDoc.id, ...freshUserDoc.data()} as UserData);
            }
         }
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Erro ao adicionar/remover saldo: ${error.message}` });
    }
  };

  const approveDeposit = async (depositId: string, userId: string, amount: number) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        toast({ variant: "destructive", title: "Erro", description: "Usuário não encontrado." });
        setLoading(false);
        return;
      }
      
      const currentBalance = userDoc.data().saldo || 0;
      await updateDoc(userDocRef, { saldo: currentBalance + amount });
  
      const depositDocRef = doc(db, "pendingDeposits", depositId);
      await updateDoc(depositDocRef, { status: "approved" });
  
      toast({ title: "Depósito aprovado!", description: `Ƶ${amount} adicionado à conta.` });
      fetchPendingDeposits();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: error.message });
    }
    setLoading(false);
  };

  const rejectDeposit = async (depositId: string) => {
    setLoading(true);
    try {
        const depositDocRef = doc(db, "pendingDeposits", depositId);
        // Option 1: Update status to 'rejected'
        await updateDoc(depositDocRef, { status: "rejected" });
        // Option 2: Delete the document (if you prefer not to keep rejected records)
        // await deleteFirestoreDoc(depositDocRef); 
        toast({ title: "Depósito rejeitado." });
        fetchPendingDeposits();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao rejeitar", description: error.message });
    }
    setLoading(false);
  };

  if (loading && !isAdmin) { // Show main loading only if not yet determined if admin
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Carregando Painel de Administração...</p>
        <Skeleton className="w-1/2 h-8 mt-2" />
      </div>
    );
  }

  if (!isAdmin && !loading) { // If loading is done and not admin
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Você não tem permissão para acessar esta página.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Voltar ao Painel</Button>
            </CardContent>
        </Card>
      </div>
    );
  }

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
          Zaca Bank - Admin
        </h1>
      </div>
      <div className="flex justify-around w-full max-w-md mb-8 z-20 mobile-nav-buttons">
        <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Início</span></Button>
        {/* Add other relevant admin navigation if needed */}
      </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl px-4 z-20">
        <Card className="w-full">
          <CardHeader><CardTitle>Gerenciar Saldo de Usuários</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-select">Usuário:</Label>
              <Select onValueChange={(value) => setSelectedUser(value)} value={selectedUser || ""}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                       {user.fullName || `Usuário (ID: ${user.id.substring(0,5)})`} (Nº {user.callNumber || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUserDetails && (
                <div className="p-3 bg-muted rounded-md text-sm">
                    <p><strong>Nome:</strong> {selectedUserDetails.fullName || "Não informado"}</p>
                    <p><strong>Nº Chamada:</strong> {selectedUserDetails.callNumber || "N/A"}</p>
                    <p><strong>Saldo Normal:</strong> Ƶ {selectedUserDetails.saldo?.toFixed(2) || '0.00'}</p>
                    <p><strong>Saldo Caixinha:</strong> Ƶ {selectedUserDetails.saldoCaixinha?.toFixed(2) || '0.00'}</p>
                </div>
            )}
            <div>
              <Label htmlFor="balance-type-select">Tipo de Saldo:</Label>
              <Select onValueChange={(value) => setSelectedBalanceType(value as "saldo" | "saldoCaixinha")} value={selectedBalanceType}>
                <SelectTrigger id="balance-type-select">
                  <SelectValue placeholder="Tipo de Saldo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saldo">Saldo Normal</SelectItem>
                  <SelectItem value="saldoCaixinha">Saldo Caixinha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount-input">Valor:</Label>
              <Input id="amount-input" type="number" placeholder="0.00" value={addRemoveAmount} onChange={(e) => setAddRemoveAmount(e.target.value)} />
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setIsAdding(true)} variant={isAdding ? "default" : "outline"} className="flex-1">Adicionar</Button>
              <Button onClick={() => setIsAdding(false)} variant={!isAdding ? "default" : "outline"} className="flex-1">Remover</Button>
            </div>
            <Button onClick={handleAddRemoveBalance} className="w-full">Aplicar Alteração</Button>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader><CardTitle>Depósitos Pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {loading && pendingDeposits.length === 0 && <Skeleton className="w-full h-20" />}
            {!loading && pendingDeposits.length === 0 && <p>Nenhum depósito pendente.</p>}
            {pendingDeposits.map((deposit) => (
              <Card key={deposit.id} className="p-4 space-y-2">
                <p><strong>Usuário:</strong> {deposit.userFullName || `Usuário (ID: ${deposit.userId.substring(0,5)})`} (Nº {deposit.userCallNumber || 'N/A'})</p>
                <p><strong>Valor:</strong> Ƶ {deposit.amount.toFixed(2)}</p>
                <p><strong>Data:</strong> {deposit.date?.toDate ? deposit.date.toDate().toLocaleString() : new Date(deposit.date).toLocaleString()}</p>
                {deposit.fileURL && (
                    <a href={deposit.fileURL} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                        Ver Comprovante
                    </a>
                )}
                <div className="flex space-x-2 mt-2">
                  <Button onClick={() => approveDeposit(deposit.id, deposit.userId, deposit.amount)} size="sm" className="bg-green-500 hover:bg-green-600">Aprovar</Button>
                  <Button onClick={() => rejectDeposit(deposit.id)} size="sm" variant="destructive">Rejeitar</Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

