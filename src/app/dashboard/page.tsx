"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
const app = initializeApp(firebaseConfig);

export default function Dashboard() {
    const [saldo, setSaldo] = useState<number | null>(null);
    const [saldoCaixinha, setSaldoCaixinha] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const router = useRouter();
    const { toast } = useToast();
    const [isCaixinhaModalOpen, setIsCaixinhaModalOpen] = useState(false);
    const [addCaixinhaValue, setAddCaixinhaValue] = useState<string>("");
    const [withdrawCaixinhaValue, setWithdrawCaixinhaValue] = useState<string>("");

    const auth = getAuth(app);
    const db = getFirestore(app);

    const fetchUserBalance = useCallback(async (userId: string) => {
        const userDoc = doc(db, "users", userId);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
            setSaldo(docSnap.data().saldo || 0);
            setSaldoCaixinha(docSnap.data().saldoCaixinha || 0);
            setLoading(false);
        } else {
            console.log("No such document!");
            setSaldo(0);
            setSaldoCaixinha(0);
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                fetchUserBalance(user.uid);
                setIsAdmin(false); // Default to false, will be updated by the next listener

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
                <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-2" /></Button>
            </div>
            <Separator className="w-full max-w-md mb-8 z-20" />

            <Card className="w-96 z-20">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl">Painel do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 main-content">
                    <div>
                        <p className="text-3xl font-semibold">
                            Saldo Atual: Ƶ {loading ? <Skeleton width={150} /> : (saldo !== null ? saldo.toFixed(2) : "0.00")}
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
                            <Wallet className="mr-2"/>
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
                            Saldo Caixinha: Ƶ {loading ? <Skeleton width={100}/> : (saldoCaixinha !== null ? saldoCaixinha.toFixed(2) : "0.00")}
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

        </div>
    );
}

