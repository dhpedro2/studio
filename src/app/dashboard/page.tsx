"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc, collection, query, getDocs, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Home, Wallet, Clock, User, PiggyBank, Settings } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

export default function Dashboard() {
    const [saldo, setSaldo] = useState<number | null>(null);
    const [saldoCaixinha, setSaldoCaixinha] = useState<number | null>(null);
    const [loadingSaldo, setLoadingSaldo] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [addRemoveAmount, setAddRemoveAmount] = useState<string>("");
    const [isAdding, setIsAdding] = useState<boolean>(true);
    const [selectedBalanceType, setSelectedBalanceType] = useState<"saldo" | "saldoCaixinha">("saldo");
    const router = useRouter();
    const { toast } = useToast();
    const [isCaixinhaModalOpen, setIsCaixinhaModalOpen] = useState(false);
    const [addCaixinhaValue, setAddCaixinhaValue] = useState<string>("");
    const [withdrawCaixinhaValue, setWithdrawCaixinhaValue] = useState<string>("");
    const [adminNormalBalance, setAdminNormalBalance] = useState<number | null>(null);
    const [adminCaixinhaBalance, setAdminCaixinhaBalance] = useState<number | null>(null);

    const auth = getAuth(app);
    const db = getFirestore(app);

    const fetchUserBalance = useCallback(async (userId: string) => {
        const userDoc = doc(db, "users", userId);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
            setSaldo(docSnap.data().saldo || 0);
            setSaldoCaixinha(docSnap.data().saldoCaixinha || 0);
            setLoadingSaldo(false);
        } else {
            console.log("No such document!");
            setSaldo(0);
            setSaldoCaixinha(0);
            setLoadingSaldo(false);
        }
    }, [db]);

    const fetchAdminBalances = useCallback(async (userId: string) => {
        if (!userId) return;
        try {
            const userDoc = doc(db, "users", userId);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                setAdminNormalBalance(docSnap.data().saldo || 0);
                setAdminCaixinhaBalance(docSnap.data().saldoCaixinha || 0);
            } else {
                setAdminNormalBalance(null);
                setAdminCaixinhaBalance(null);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: `Erro ao carregar saldos do usuário: ${error.message}`,
            });
            setAdminNormalBalance(null);
            setAdminCaixinhaBalance(null);
        }
    }, [db, toast]);

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                fetchUserBalance(user.uid);
                setIsAdmin(false); // Default to false, will be updated by the next listener
                fetchUsers();

                //Check if user exists
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    // User document not found, redirect to login
                    router.push("/");
                    toast({
                        variant: "destructive",
                        title: "Conta não encontrada",
                        description: "Sua conta pode ter sido excluída. Por favor, faça login novamente.",
                    });
                    return;
                }
                
                // Listen for real-time balance updates
                const userDocRef2 = doc(db, "users", user.uid);
                onSnapshot(userDocRef2, (doc) => {
                    if (doc.exists()) {
                        setSaldo(doc.data().saldo || 0);
                        setSaldoCaixinha(doc.data().saldoCaixinha || 0);
                    }
                });
                // Listen for admin status
                const adminDocRef = doc(db, "users", user.uid);
                getDoc(adminDocRef).then((docSnap) => {
                    if (docSnap.exists()) {
                        setIsAdmin(docSnap.data().isAdmin || false);
                    }
                });
            } else {
                router.push("/");
            }
        });

        return () => unsubscribe();
    }, [auth, db, router, fetchUserBalance]);

     const handleAddCaixinha = async () => {
         if (!auth.currentUser || !addCaixinhaValue) {
             return;
         }
         const value = parseFloat(addCaixinhaValue);
         if (isNaN(value) || value <= 0) {
             toast({
                 variant: "destructive",
                 title: "Erro",
                 description: "Por favor, insira um valor válido.",
             });
             return;
         }

         try {
             const userDocRef = doc(db, "users", auth.currentUser.uid);
             const userDoc = await getDoc(userDocRef);
             let currentSaldo = userDoc.data().saldo || 0;
             let currentSaldoCaixinha = userDoc.data().saldoCaixinha || 0;

             if (currentSaldo < value) {
                 toast({
                     variant: "destructive",
                     title: "Saldo insuficiente",
                     description: "Você não tem saldo suficiente para adicionar à Caixinha.",
                 });
                 return;
             }

             await updateDoc(userDocRef, {
                 saldo: currentSaldo - value,
                 saldoCaixinha: currentSaldoCaixinha + value,
             });
             toast({
                 title: "Sucesso",
                 description: `Ƶ ${value} adicionado à Caixinha.`,
             });

             setAddCaixinhaValue(""); // Clear the input field
             setIsCaixinhaModalOpen(false); // Close the modal
         } catch (error: any) {
             toast({
                 variant: "destructive",
                 title: "Erro",
                 description: `Erro ao adicionar saldo à Caixinha: ${error.message}`,
             });
         }
     };

    const handleWithdrawCaixinha = async () => {
         if (!auth.currentUser || !withdrawCaixinhaValue) {
             return;
         }
         const value = parseFloat(withdrawCaixinhaValue);
         if (isNaN(value) || value <= 0) {
             toast({
                 variant: "destructive",
                 title: "Erro",
                 description: "Por favor, insira um valor válido.",
             });
             return;
         }

         try {
             const userDocRef = doc(db, "users", auth.currentUser.uid);
             const userDoc = await getDoc(userDocRef);
             let currentSaldo = userDoc.data().saldo || 0;
             let currentSaldoCaixinha = userDoc.data().saldoCaixinha || 0;

             if (currentSaldoCaixinha < value) {
                 toast({
                     variant: "destructive",
                     title: "Saldo insuficiente",
                     description: "Você não tem saldo suficiente para retirar da Caixinha.",
                 });
                 return;
             }

             await updateDoc(userDocRef, {
                 saldo: currentSaldo + value,
                 saldoCaixinha: currentSaldoCaixinha - value,
             });
             toast({
                 title: "Sucesso",
                 description: `Ƶ ${value} retirado da Caixinha.`,
             });

             setWithdrawCaixinhaValue(""); // Clear the input field
             setIsCaixinhaModalOpen(false); // Close the modal
         } catch (error: any) {
             toast({
                 variant: "destructive",
                 title: "Erro",
                 description: `Erro ao retirar saldo da Caixinha: ${error.message}`,
             });
         }
     };

  const handleAddRemoveBalance = async () => {
    if (!selectedUserId || !addRemoveAmount) {
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
      const userDocRef = doc(db, "users", selectedUserId);
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
      fetchAdminBalances(selectedUserId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao adicionar/remover saldo: ${error.message}`,
      });
    }
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
            <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10" />
            <div className="flex justify-center items-center py-4">
                <h1 className="text-4xl font-semibold text-purple-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
                    Zaca Bank
                </h1>
            </div>
            {/* Navigation Buttons */}
            <div className="flex justify-around w-full max-w-md mb-8 z-20 mobile-nav-buttons">
                <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-2" /></Button>
                <Button onClick={() => router.push("/transfer")} variant="ghost" className="md:text-sm"><Wallet className="mr-2" /></Button>
                <Button onClick={() => router.push("/history")} variant="ghost" className="md:text-sm"><Clock className="mr-2" /></Button>
+            <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-2" /></Button>
            </div>
            <Separator className="w-full max-w-md mb-8 z-20" />

            <Card className="w-96 z-20">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl">Painel do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 main-content">
                    <div>
                        <p className="text-3xl font-semibold">
                            Saldo Atual: Ƶ {loadingSaldo ? <Skeleton width={150} /> : (saldo !== null ? saldo.toFixed(2) : "0.00")}
                        </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Button onClick={() => router.push("/transfer")} variant="outline">
                            <Wallet className="mr-2" />
                            Transferir
                        </Button>
                        <Button onClick={() => router.push("/history")} variant="outline">
                            <Clock className="mr-2" />
                            Histórico de Transações
                        </Button>
                        <Button onClick={() => router.push("/profile")} variant="outline">
                            <User className="mr-2" />
                            Perfil
                         </Button>
                         <Button onClick={() => setIsCaixinhaModalOpen(true)} variant="outline">
                            <PiggyBank className="mr-2"/>
                            Caixinha
                        </Button>
                    </div>

                </CardContent>
            </Card>
            <Dialog open={isCaixinhaModalOpen} onOpenChange={setIsCaixinhaModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Caixinha</DialogTitle>
                        <DialogDescription className="text-2xl">
                            Saldo Caixinha: Ƶ {loadingSaldo ? <Skeleton width={100}/> : (saldoCaixinha !== null ? saldoCaixinha.toFixed(2) : "0.00")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="grid gap-2">
                            <Label htmlFor="addCaixinhaValue">Adicionar Saldo:</Label>
                            <Input
                                type="number"
                                id="addCaixinhaValue"
                                placeholder="0.00"
                                value={addCaixinhaValue}
                                onChange={(e) => setAddCaixinhaValue(e.target.value)}
                            />
                            <Button onClick={handleAddCaixinha}>Adicionar</Button>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="withdrawCaixinhaValue">Retirar Saldo:</Label>
                            <Input
                                type="number"
                                id="withdrawCaixinhaValue"
                                placeholder="0.00"
                                value={withdrawCaixinhaValue}
                                onChange={(e) => setWithdrawCaixinhaValue(e.target.value)}
                            />
                            <Button onClick={handleWithdrawCaixinha}>Retirar</Button>
                        </div>
                    </div>
                    
                </DialogContent>
            </Dialog>

       {isAdmin && (
         <Card className="w-96 z-20 mt-4">
           <CardHeader className="space-y-2">
             <CardTitle>Painel de Administração</CardTitle>
           </CardHeader>
           <CardContent className="grid gap-4">
             <div>
               <Label htmlFor="user">Usuário</Label>
               <select
                 id="user"
                 className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 onChange={(e) => {
                     setSelectedUserId(e.target.value);
                     fetchAdminBalances(e.target.value);
                 }}
                 value={selectedUserId || ""}
               >
                 <option value="">Selecione um usuário</option>
                 {users.map((user) => (
                   <option key={user.id} value={user.id}>
                     {user.email} ({user.name})
                   </option>
                 ))}
               </select>
               {selectedUserId && (
                <div>
                  <p>Saldo Normal: Ƶ {adminNormalBalance !== null ? adminNormalBalance.toFixed(2) : "Carregando..."}</p>
                  <p>Saldo Caixinha: Ƶ {adminCaixinhaBalance !== null ? adminCaixinhaBalance.toFixed(2) : "Carregando..."}</p>
                </div>
              )}
             </div>
             <div>
               <Label htmlFor="balanceType">Tipo de Saldo</Label>
               <select
                 id="balanceType"
                 className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 onChange={(e) => setSelectedBalanceType(e.target.value as "saldo" | "saldoCaixinha")}
                 value={selectedBalanceType}
               >
                 <option value="saldo">Saldo Normal</option>
                 <option value="saldoCaixinha">Saldo Caixinha</option>
               </select>
             </div>
             <div>
               <Label htmlFor="amount">Valor</Label>
               <Input
                 type="number"
                 id="amount"
                 placeholder="0.00"
                 value={addRemoveAmount}
                 onChange={(e) => setAddRemoveAmount(e.target.value)}
               />
             </div>
             <div className="flex space-x-2">
               <Button
                 variant={isAdding ? "default" : "outline"}
                 onClick={() => setIsAdding(true)}
               >
                 Adicionar
               </Button>
               <Button
                 variant={!isAdding ? "default" : "outline"}
                 onClick={() => setIsAdding(false)}
               >
                 Remover
               </Button>
             </div>
             <Button onClick={handleAddRemoveBalance}>Aplicar</Button>
           </CardContent>
         </Card>
       )}
        </div>
    );
}
