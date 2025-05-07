"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User, Settings, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
const app = initializeApp(firebaseConfig);
const BANK_ADMIN_USER_ID = "ZACA_BANK_ADMIN_SYSTEM";

interface Transaction {
  id: string;
  remetente: string;
  destinatario: string;
  valor: number;
  data: string;
  remetenteNome?: string;
  destinatarioNome?: string;
  adminAction?: boolean;
}

export default function Profile() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmountTransferred, setTotalAmountTransferred] = useState<number>(0); // This will now be total outgoing
  const [totalAmountReceived, setTotalAmountReceived] = useState<number>(0); // New state for total incoming
  const [transactionFrequency, setTransactionFrequency] = useState<any>({});
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (!auth.currentUser) {
        router.push("/"); // Redirect if not logged in
        setLoading(false);
        return;
      }

      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, "users", userId);
      
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || null);
          setEmail(userData.email || null);
          setCreatedAt(userData.createdAt || null);
        } else {
           router.push("/"); // Redirect if user document doesn't exist
           toast({
                variant: "destructive",
                title: "Conta não encontrada",
                description: "Sua conta pode ter sido excluída ou não existe.",
            });
           setLoading(false);
           return;
        }

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
         const adminToUserQuery = query(
            transactionsCollection,
            where("destinatario", "==", userId),
            where("adminAction", "==", true),
            orderBy("data", "desc")
        );
        const userToAdminQuery = query(
            transactionsCollection,
            where("remetente", "==", userId),
            where("adminAction", "==", true),
            orderBy("data", "desc")
        );


        const [sentSnapshot, receivedSnapshot, adminToUserSnapshot, userToAdminSnapshot] = await Promise.all([
            getDocs(sentQuery),
            getDocs(receivedQuery),
            getDocs(adminToUserQuery),
            getDocs(userToAdminSnapshot),
        ]);

        const transactionList: Transaction[] = [];
        const processedIds = new Set<string>();

        const fetchUserName = async (uid: string): Promise<string> => {
            if (uid === BANK_ADMIN_USER_ID) return "Banco";
            try {
                const targetUserDocRef = doc(db, "users", uid);
                const targetUserDoc = await getDoc(targetUserDocRef);
                return targetUserDoc.exists() ? targetUserDoc.data().name || "Usuário Desconhecido" : "Usuário Desconhecido";
            } catch (error) {
                console.error("Erro ao buscar nome do usuário:", error);
                return "Erro ao buscar nome";
            }
        };

        const processDoc = async (docSnap: any, type: 'sent' | 'received' | 'admin_to_user' | 'user_to_admin') => {
            if (processedIds.has(docSnap.id)) return;
            processedIds.add(docSnap.id);

            const data = docSnap.data() as Transaction;
            let remetenteNome = "Você";
            let destinatarioNome = "Você";

            if (data.adminAction) {
                if (data.remetente === BANK_ADMIN_USER_ID) { // Admin deposit to user
                    remetenteNome = "Banco";
                    destinatarioNome = name || "Você"; 
                } else { // Admin withdrawal from user
                    remetenteNome = name || "Você";
                    destinatarioNome = "Banco";
                }
            } else {
                 if (type === 'sent') {
                    destinatarioNome = await fetchUserName(data.destinatario);
                 } else if (type === 'received') {
                    remetenteNome = await fetchUserName(data.remetente);
                 }
            }
            transactionList.push({ id: docSnap.id, ...data, remetenteNome, destinatarioNome });
        };
        
        for (const docSnap of sentSnapshot.docs) {
            if (!docSnap.data().adminAction) await processDoc(docSnap, 'sent');
        }
        for (const docSnap of receivedSnapshot.docs) {
            if (!docSnap.data().adminAction) await processDoc(docSnap, 'received');
        }
        for (const docSnap of adminToUserSnapshot.docs) {
            await processDoc(docSnap, 'admin_to_user');
        }
        for (const docSnap of userToAdminSnapshot.docs) {
            await processDoc(docSnap, 'user_to_admin');
        }


        transactionList.sort((a, b) => (parseISO(b.data).getTime() - parseISO(a.data).getTime()));
        setTransactions(transactionList);

        const totalSent = transactionList
            .filter(t => t.remetente === userId && !t.adminAction) // Exclude admin withdrawals from this sum
            .reduce((sum, t) => sum + t.valor, 0);
        setTotalAmountTransferred(totalSent);

        const totalReceived = transactionList
            .filter(t => t.destinatario === userId && !t.adminAction) // Exclude admin deposits from this sum
            .reduce((sum, t) => sum + t.valor, 0);
        setTotalAmountReceived(totalReceived);


        const frequency: { [key: string]: number } = {};
        transactionList.forEach(transaction => {
            const dateKey = format(parseISO(transaction.data), 'yyyy-MM-dd');
            frequency[dateKey] = (frequency[dateKey] || 0) + 1;
        });
        setTransactionFrequency(frequency);

      } catch (error: any) {
          console.error("Error loading profile data:", error);
          toast({ variant: "destructive", title: "Erro ao carregar perfil", description: error.message });
      } finally {
          setLoading(false);
      }
    };
  
    loadData();
  }, [auth.currentUser, db, router, toast, name]); // Added name to dependency array

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

  const chartData = Object.entries(transactionFrequency)
    .map(([date, count]) => ({ date, count }))
    .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()) // Sort by date for chart
    .slice(-30); // Show last 30 days


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
        <div className="flex justify-center items-center py-4">
        <h1 className="text-4xl font-semibold text-purple-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
          Zaca Bank
        </h1>
      </div>
      {/* Navigation Buttons */}
        <div className="flex justify-around w-full max-w-md mb-8 z-20 mobile-nav-buttons">
            <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Início</span></Button>
            <Button onClick={() => router.push("/transfer")} variant="ghost" className="md:text-sm"><Wallet className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Transferências</span></Button>
            <Button onClick={() => router.push("/history")} variant="ghost" className="md:text-sm"><Clock className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Histórico</span></Button>
            <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Perfil</span></Button>
        </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <Card className="w-full max-w-md z-20 md:w-96">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center md:text-left">Estatísticas do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 main-content">
          <div className="flex items-center space-x-4">
             <Avatar className="h-16 w-16"> {/* Increased size */}
                 {loading ? (
                     <Skeleton className="h-16 w-16 rounded-full"/>
                 ) : (
                 <AvatarFallback className="text-2xl">{name ? name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                 )}
              </Avatar>
            <div className="flex-1"> {/* Added flex-1 to allow text to take available space */}
              <p className="text-lg font-semibold">
                Nome: {loading ? <Skeleton className="inline-block w-32 h-5"/> : (name || "Carregando...")}
              </p>
              <p className="text-md text-muted-foreground"> {/* Adjusted size and color for email */}
                Email: {loading ? <Skeleton className="inline-block w-48 h-5"/> : (email || "Carregando...")}
              </p>
               {createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                    Membro desde: {format(parseISO(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
          <Separator />

          <div className="grid grid-cols-2 gap-4 text-center md:text-left">
            <div>
                <h2 className="text-sm font-medium text-muted-foreground">Total Enviado</h2>
                <p className="text-2xl font-semibold text-red-600">Ƶ {loading ? <Skeleton className="inline-block w-24 h-7"/> : totalAmountTransferred.toFixed(2)}</p>
            </div>
            <div>
                <h2 className="text-sm font-medium text-muted-foreground">Total Recebido</h2>
                <p className="text-2xl font-semibold text-green-600">Ƶ {loading ? <Skeleton className="inline-block w-24 h-7"/> : totalAmountReceived.toFixed(2)}</p>
            </div>
          </div>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mt-2 mb-2">Frequência de Transações (Últimos 30 dias)</h2>
            {loading ? (
                <Skeleton className="w-full h-48"/>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), 'dd/MM')} />
                  <YAxis allowDecimals={false}/>
                  <Tooltip 
                    labelFormatter={(label) => format(parseISO(label), "dd 'de' MMMM", { locale: ptBR })}
                    formatter={(value: number) => [`${value} trans.`, "Transações"]}
                  />
                  <Legend formatter={() => "Transações"}/>
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center">Nenhuma transação encontrada para exibir o gráfico.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
