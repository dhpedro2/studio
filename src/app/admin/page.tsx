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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [addRemoveAmount, setAddRemoveAmount] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(true); // true for add, false for remove
  const [selectedBalanceType, setSelectedBalanceType] = useState<"saldo" | "saldoCaixinha">("saldo");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().isAdmin) {
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
  
  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message,
      });
    }
  };

  const handleAddRemoveBalance = async () => {
    if (!selectedUser || !addRemoveAmount) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um usuário e insira um valor.",
      });
      return;
    }

    const value = parseFloat(addRemoveAmount);

    if (isNaN(value)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um valor numérico válido.",
      });
      return;
    }

    try {
      const userDocRef = doc(db, "users", selectedUser);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não encontrado.",
        });
        return;
      }

      const currentBalance = userDoc.data()[selectedBalanceType] || 0;
      const newBalance = isAdding ? currentBalance + value : currentBalance - value;

      await updateDoc(userDocRef, {
        [selectedBalanceType]: newBalance,
      });

      toast({
        title: "Sucesso",
        description: `Saldo ${isAdding ? "adicionado" : "removido"} com sucesso.`,
      });

      setAddRemoveAmount("");
      fetchUsers(); // Refresh users list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao adicionar/remover saldo: ${error.message}`,
      });
    }
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
      
      const currentBalance = userDoc.data().saldo || 0;
      await updateDoc(userDocRef, { saldo: currentBalance + amount });
  
      const depositDocRef = doc(db, "pendingDeposits", depositId);
      await updateDoc(depositDocRef, { status: "approved" });
  
      toast({
        title: "Depósito aprovado com sucesso!",
        description: `Ƶ${amount} foi adicionado à conta do usuário.`,
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
            await updateDoc(depositDocRef, { status: "rejected" });

            toast({
                title: "Depósito rejeitado com sucesso!",
                description: `O depósito de Ƶ${amount} do usuário foi rejeitado.`,
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
        Carregando Painel de Administração...
        
          Carregando...
        
      
    );
  }

  if (!isAdmin) {
    return (
      
        
          Acesso Negado
        
        
          Você não tem permissão para acessar esta página.
        
        
          Voltar ao Painel
        
      
    );
  }

  return (
    
      
      
          
              Zaca Bank - Admin Panel
          
      
      {/* Navigation Buttons */}
      
          
              Início
          
          
              Transferências
          
          
              Histórico
          
          
              Perfil
          
      
      
      

      
        
          
            Gerenciar Saldo dos Usuários
          
        
        
          
            
              Usuário:
              
                
                    {users.map((user) => (
                      
                          {user.email} ({user.name})
                        
                    ))}
                  
                
              
            
            
              Tipo de Saldo:
              
                
                    Saldo Normal
                
                
                    Saldo Caixinha
                
              
            
            
              Valor:
              
            
            
              
                Adicionar
              
              
                Remover
              
            
            
              
                Aplicar
              
            
          
        
      
    
  );
}
