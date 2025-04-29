"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, onSnapshot, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeApp } from "firebase/app";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User, Upload, Settings, Download } from 'lucide-react';
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";

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
    const [loading, setLoading] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [addRemoveAmount, setAddRemoveAmount] = useState<string>("");
    const router = useRouter();
    const { toast } = useToast();
    const [isCaixinhaModalOpen, setIsCaixinhaModalOpen] = useState(false);

    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    const fetchUserBalance = useCallback(async (userId: string) => {
        const userDoc = doc(db, "users", userId);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
            setLoading(false);
            setSaldo(docSnap.data().saldo || 0);
        } else {
            console.log("No such document!");
            setSaldo(0);
        }
    }, [db]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setLoading(true);
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
                    description: `Saldo de ${userDoc.data().name} atualizado para Ƶ ${newSaldo.toFixed(2)}.`,
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

            {isAdmin && (
                <Card className="w-96 mt-8 z-20">
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
                                        {user.name} ({user.email}) - Ƶ {user.saldo ? user.saldo.toFixed(2) : '0.00'}
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
            <Dialog open={isCaixinhaModalOpen} onOpenChange={setIsCaixinhaModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Caixinha</DialogTitle>
                        <DialogDescription>
                            Em construção
                        </DialogDescription>
                    </DialogHeader>
                    
                </DialogContent>
            </Dialog>

        </div>
    );
}