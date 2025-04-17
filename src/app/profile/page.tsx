"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, updateProfile, updatePassword, signOut } from "firebase/auth";
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
import { Home, Wallet, Clock, User, Settings, Moon, Sun, Pencil, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { useTheme } from 'next-themes';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const [newPassword, setNewPassword] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string | null>(null); // New state for account creation date
  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const loadTransactions = async () => {
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

  const handleUpdateName = async () => {
        try {
            if (auth.currentUser && name) {
                await updateProfile(auth.currentUser, {
                    displayName: name,
                });

                const userDocRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    name: name,
                });

                toast({
                    title: "Nome atualizado com sucesso!",
                    description: "Seu nome foi atualizado.",
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar o nome",
                description: error.message,
            });
        }
    };

    const handleUpdatePassword = async () => {
        try {
            if (auth.currentUser && newPassword) {
                await updatePassword(auth.currentUser, newPassword);
                toast({
                    title: "Senha atualizada com sucesso!",
                    description: "Sua senha foi atualizada.",
                });
                setNewPassword("");
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar a senha",
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
          <CardTitle>Estatísticas do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-4">
             <Avatar>
                <AvatarImage src="https://picsum.photos/500/500" alt="Avatar" />
                <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
              </Avatar>
            <div>
              <p className="text-lg font-semibold">
                Nome: {name || "Carregando..."}
              </p>
               <Button variant="secondary" size="sm" onClick={handleUpdateName}>
                <Pencil className="mr-2 h-4 w-4" />
                Alterar Nome
              </Button>
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold">
              Email: {email || "Carregando..."}
            </p>
          </div>
            <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="flex items-center space-x-2">
                    <Input
                        id="newPassword"
                        type="password"
                        placeholder="Nova senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button variant="secondary" size="sm" onClick={handleUpdatePassword}>
                        <Lock className="mr-2 h-4 w-4" />
                        Alterar Senha
                    </Button>
                </div>
            </div>
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
          {createdAt && (
              <div>
                <p className="text-lg font-semibold">
                  Conta criada em: {format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
          </div>
          <div className="flex flex-col space-y-2">
             <Button variant="destructive" onClick={handleLogout}>
                Sair
             </Button>
           </div>
           <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                  id="theme"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
              <Moon className="h-4 w-4" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

