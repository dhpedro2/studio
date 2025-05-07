"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc, collection, query, getDocs, where, addDoc, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Home, Wallet, Clock, User, PiggyBank, Settings, TrendingUp } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { addDays, format, isSameDay, isWeekend, parseISO, startOfDay, subDays } from 'date-fns';


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

interface CaixinhaYield {
    date: string; // Store as 'yyyy-MM-dd' string
    yieldAmount: number;
    userPortion: number;
    bankPortion: number;
}

export default function Dashboard() {
    const [saldo, setSaldo] = useState<number | null>(null);
    const [saldoCaixinha, setSaldoCaixinha] = useState<number | null>(null);
    const [caixinhaYieldHistory, setCaixinhaYieldHistory] = useState<CaixinhaYield[]>([]);
    const [lastYieldDate, setLastYieldDate] = useState<Date | null>(null); // Storing as Date object for calculations
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
    const [caixinhaActionValue, setCaixinhaActionValue] = useState<string>("");
    const [selectedCaixinhaAction, setSelectedCaixinhaAction] = useState<"adicionar" | "retirar">("adicionar");
    const [adminNormalBalance, setAdminNormalBalance] = useState<number | null>(null);
    const [adminCaixinhaBalance, setAdminCaixinhaBalance] = useState<number | null>(null);

    const auth = getAuth(app);
    const db = getFirestore(app);

    const calculateDailyYield = useCallback(async (userId: string, currentCaixinhaBalance: number, currentLastYieldDate: Date | null) => {
        if (currentCaixinhaBalance <= 0) return;

        const ANNUAL_INTEREST_RATE = 0.14;
        const WORKING_DAYS_IN_YEAR = 252;
        const DAILY_RATE = ANNUAL_INTEREST_RATE / WORKING_DAYS_IN_YEAR;
        const BANK_EMAIL = "dhpedro@duck.com"; // Not used for transfer, just for record.

        let processingDate = currentLastYieldDate ? addDays(startOfDay(currentLastYieldDate), 1) : subDays(new Date(), 7); // Start from day after last yield or 7 days ago
        const today = startOfDay(new Date());
        let newBalance = currentCaixinhaBalance;
        let updatedLastYieldDate = currentLastYieldDate;
        const newYieldHistoryEntries: CaixinhaYield[] = [];

        while (startOfDay(processingDate) <= today) {
            if (!isWeekend(processingDate)) {
                const dailyYield = newBalance * DAILY_RATE;
                const bankPortion = dailyYield * 0.01;
                const userPortion = dailyYield - bankPortion; // User gets 99%
                newBalance += userPortion;

                newYieldHistoryEntries.push({
                    date: format(processingDate, 'yyyy-MM-dd'),
                    yieldAmount: dailyYield,
                    userPortion,
                    bankPortion,
                });
                updatedLastYieldDate = startOfDay(processingDate);
            }
            processingDate = addDays(processingDate, 1);
        }

        if (newYieldHistoryEntries.length > 0 && updatedLastYieldDate) {
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                const existingHistory = userDocSnap.data()?.caixinhaYieldHistory || [];
                
                const updatedHistory = [...existingHistory, ...newYieldHistoryEntries];
                // Sort history by date just in case and keep only unique entries by date
                const uniqueHistory = Array.from(new Map(updatedHistory.map(item => [item.date, item])).values())
                                         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


                await updateDoc(userDocRef, {
                    saldoCaixinha: newBalance,
                    lastYieldDate: Timestamp.fromDate(updatedLastYieldDate), // Store as Firestore Timestamp
                    caixinhaYieldHistory: uniqueHistory
                });

                setSaldoCaixinha(newBalance);
                setLastYieldDate(updatedLastYieldDate);
                setCaixinhaYieldHistory(uniqueHistory.slice(-30));
            } catch (error) {
                console.error("Error updating yield:", error);
                toast({ variant: "destructive", title: "Erro ao calcular rendimento", description: (error as Error).message });
            }
        }
    }, [db, toast]);


    const fetchUserBalance = useCallback(async (userId: string) => {
        setLoadingSaldo(true);
        const userDocRef = doc(db, "users", userId);
        try {
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setSaldo(data.saldo || 0);
                setSaldoCaixinha(data.saldoCaixinha || 0);
                
                // Handle lastYieldDate conversion from Firestore Timestamp
                const lastYieldTimestamp = data.lastYieldDate;
                const loadedLastYieldDate = lastYieldTimestamp ? (lastYieldTimestamp as Timestamp).toDate() : null;
                setLastYieldDate(loadedLastYieldDate);

                const historyFromDb = data.caixinhaYieldHistory || [];
                setCaixinhaYieldHistory(historyFromDb.slice(-30)); // Show last 30 days for chart

                await calculateDailyYield(userId, data.saldoCaixinha || 0, loadedLastYieldDate);
            } else {
                console.log("No such document for user balance!");
                router.push("/");
                toast({
                    variant: "destructive",
                    title: "Conta não encontrada",
                    description: "Sua conta pode ter sido excluída ou não existe.",
                });
            }
        } catch (error) {
            console.error("Error fetching user balance:", error);
            toast({ variant: "destructive", title: "Erro ao buscar saldo", description: (error as Error).message });
            router.push("/");
        } finally {
            setLoadingSaldo(false);
        }
    }, [db, router, toast, calculateDailyYield]);

    const fetchAdminBalances = useCallback(async (userIdToFetch: string) => {
        if (!userIdToFetch) return;
        try {
            const userDocRef = doc(db, "users", userIdToFetch);
            const docSnap = await getDoc(userDocRef);

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

    const fetchUsers = useCallback(async () => {
        if (isAdmin) {
            try {
                const usersCollection = collection(db, "users");
                const usersSnapshot = await getDocs(usersCollection);
                const usersList = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setUsers(usersList);
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar usuários",
                    description: error.message,
                });
            }
        }
    }, [db, toast, isAdmin]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                
                // Initial fetch and admin check
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    router.push("/");
                    toast({
                        variant: "destructive",
                        title: "Conta não encontrada",
                        description: "Sua conta pode ter sido excluída. Por favor, faça login novamente.",
                    });
                    return;
                }
                
                const userData = userDocSnap.data();
                setIsAdmin(userData.isAdmin || false);
                await fetchUserBalance(user.uid); // Ensure this completes before admin-specific fetches
                
                if (userData.isAdmin) {
                    fetchUsers();
                }

                // Real-time listener for user data
                const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setSaldo(data.saldo || 0);
                        setSaldoCaixinha(data.saldoCaixinha || 0);
                        const lastYieldTimestamp = data.lastYieldDate;
                        const newLastYieldDate = lastYieldTimestamp ? (lastYieldTimestamp as Timestamp).toDate() : null;
                        
                        // Check if lastYieldDate has actually changed to avoid re-running calculation unnecessarily
                        if (newLastYieldDate?.getTime() !== lastYieldDate?.getTime()) {
                           setLastYieldDate(newLastYieldDate);
                           // Optionally re-calculate yield if lastYieldDate changes from another source,
                           // though calculateDailyYield is designed to catch up.
                        }
                        const historyFromDb = data.caixinhaYieldHistory || [];
                        setCaixinhaYieldHistory(historyFromDb.slice(-30));
                    } else {
                         // This case might indicate the user was deleted while active
                        router.push("/");
                        toast({ variant: "destructive", title: "Usuário não encontrado", description: "Sua sessão pode ter sido invalidada."});
                    }
                });
                return () => unsubSnapshot(); // Cleanup snapshot listener
            } else {
                router.push("/");
            }
        });

        return () => unsubscribe(); // Cleanup auth listener
    }, [auth, db, router, fetchUserBalance, fetchUsers, toast, lastYieldDate]);

    const handleCaixinhaAction = async () => {
        if (!auth.currentUser || !caixinhaActionValue) return;

        const value = parseFloat(caixinhaActionValue);
        if (isNaN(value) || value <= 0) {
            toast({ variant: "destructive", title: "Erro", description: "Por favor, insira um valor válido." });
            return;
        }

        try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) return;

            let currentSaldo = userDoc.data().saldo || 0;
            let currentSaldoCaixinha = userDoc.data().saldoCaixinha || 0;
            let newLastYieldDate = lastYieldDate; // Keep current if no yield calculation needed

            if (selectedCaixinhaAction === "adicionar") {
                if (currentSaldo < value) {
                    toast({ variant: "destructive", title: "Saldo insuficiente", description: "Você não tem saldo suficiente para adicionar à Caixinha." });
                    return;
                }
                currentSaldo -= value;
                currentSaldoCaixinha += value;
                // If adding to an empty caixinha or after a while, ensure lastYieldDate is recent enough for yield calculation
                if(currentSaldoCaixinha - value === 0 || !lastYieldDate) { // if was 0 or no last yield date
                    newLastYieldDate = subDays(new Date(),1); // set to yesterday to trigger today's yield calc
                }

            } else if (selectedCaixinhaAction === "retirar") {
                if (currentSaldoCaixinha < value) {
                    toast({ variant: "destructive", title: "Saldo insuficiente", description: "Você não tem saldo suficiente para retirar da Caixinha." });
                    return;
                }
                currentSaldo += value;
                currentSaldoCaixinha -= value;
            }
            
            const updateData: any = {
                saldo: currentSaldo,
                saldoCaixinha: currentSaldoCaixinha,
            };

            if (newLastYieldDate && newLastYieldDate !== lastYieldDate) {
                 updateData.lastYieldDate = Timestamp.fromDate(newLastYieldDate);
            }

            await updateDoc(userDocRef, updateData);

            toast({ title: "Sucesso", description: `Ƶ ${value.toFixed(2)} ${selectedCaixinhaAction === "adicionar" ? 'adicionado à' : 'retirado da'} Caixinha.` });
            
            setCaixinhaActionValue("");
            setIsCaixinhaModalOpen(false);
            // Trigger yield calculation if balance or date changed
            await calculateDailyYield(auth.currentUser.uid, currentSaldoCaixinha, newLastYieldDate);


        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: `Erro na operação da Caixinha: ${error.message}` });
        }
    };

    const handleAddRemoveBalance = async () => {
        if (!selectedUserId || !addRemoveAmount) {
            toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione um usuário e insira um valor." });
            return;
        }
        const value = parseFloat(addRemoveAmount);
        if (isNaN(value) || value <=0) { 
            toast({ variant: "destructive", title: "Erro", description: "Por favor, insira um valor numérico positivo válido." });
            return;
        }

        try {
            const userDocRef = doc(db, "users", selectedUserId);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                toast({ variant: "destructive", title: "Erro", description: "Usuário não encontrado." });
                return;
            }

            const currentBalanceField = selectedBalanceType; // "saldo" or "saldoCaixinha"
            const currentBalanceValue = userDoc.data()[currentBalanceField] || 0;
            
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
            
            await updateDoc(userDocRef, { [currentBalanceField]: newBalance });

            const transactionData: any = {
                data: new Date().toISOString(),
                valor: value,
                adminAction: true, 
            };

            if (isAdding) {
                transactionData.remetente = BANK_ADMIN_USER_ID;
                transactionData.destinatario = selectedUserId;
                transactionData.tipo = `admin_deposit_${selectedBalanceType}`;
            } else {
                transactionData.remetente = selectedUserId;
                transactionData.destinatario = BANK_ADMIN_USER_ID;
                transactionData.tipo = `admin_withdrawal_${selectedBalanceType}`;
            }
            await addDoc(collection(db, "transactions"), transactionData);


            toast({ title: "Sucesso", description: `Saldo ${isAdding ? "adicionado" : "removido"} com sucesso.` });
            setAddRemoveAmount("");
            fetchUsers();
            fetchAdminBalances(selectedUserId);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: `Erro ao adicionar/remover saldo: ${error.message}` });
        }
    };
    
    const chartData = caixinhaYieldHistory.map(item => ({
        name: format(parseISO(item.date), 'dd/MM'), // Ensure item.date is correctly formatted string 'yyyy-MM-dd'
        Rendimento: parseFloat(item.userPortion.toFixed(2)),
    }));


    return (
        <div className="relative flex flex-col items-center justify-start min-h-screen py-8">
            <video
                src="https://static.moewalls.com/videos/preview/2023/pink-wave-sunset-preview.webm"
                autoPlay
                loop
                muted
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />
            <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10" />
            <div className="flex justify-center items-center py-4 z-20">
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
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl text-center md:text-left">Painel do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 main-content">
                    <div>
                        <p className="text-3xl font-semibold">
                            Saldo Atual: Ƶ {loadingSaldo ? <Skeleton className="inline-block w-36 h-8" /> : (saldo !== null ? saldo.toFixed(2) : "0.00")}
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
                         <Button onClick={() => setIsCaixinhaModalOpen(true)} variant="outline">
                            <PiggyBank className="mr-2" />
                            Caixinha
                        </Button>
                        <Button onClick={() => router.push("/profile")} variant="outline">
                            <User className="mr-2" />
                            Perfil
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCaixinhaModalOpen} onOpenChange={setIsCaixinhaModalOpen}>
                <DialogContent className="sm:max-w-sm md:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Caixinha</DialogTitle>
                        <DialogDescription className="text-xl">
                            Saldo Caixinha: Ƶ {loadingSaldo ? <Skeleton className="inline-block w-24 h-6" /> : (saldoCaixinha !== null ? saldoCaixinha.toFixed(2) : "0.00")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button 
                                variant={selectedCaixinhaAction === "adicionar" ? "default" : "outline"}
                                onClick={() => setSelectedCaixinhaAction("adicionar")}
                            >
                                Adicionar
                            </Button>
                            <Button 
                                variant={selectedCaixinhaAction === "retirar" ? "default" : "outline"}
                                onClick={() => setSelectedCaixinhaAction("retirar")}
                            >
                                Retirar
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="caixinhaActionValue">Valor:</Label>
                            <Input
                                type="number"
                                id="caixinhaActionValue"
                                placeholder="0.00"
                                value={caixinhaActionValue}
                                onChange={(e) => setCaixinhaActionValue(e.target.value)}
                            />
                        </div>
                         <Button onClick={handleCaixinhaAction}>Aplicar</Button>
                    </div>
                    <Separator />
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Histórico de Rendimentos (Últimos 30 dias)</h3>
                        {chartData.length > 0 ? (
                             <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Rendimento" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum rendimento registrado nos últimos 30 dias ou saldo insuficiente na caixinha.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCaixinhaModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isAdmin && (
                <Card className="w-full max-w-md z-20 md:w-96 mt-4">
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
                                <div className="mt-2 text-sm">
                                    <p>Saldo Normal: Ƶ {adminNormalBalance !== null ? adminNormalBalance.toFixed(2) : <Skeleton className="inline-block w-20 h-4" />}</p>
                                    <p>Saldo Caixinha: Ƶ {adminCaixinhaBalance !== null ? adminCaixinhaBalance.toFixed(2) : <Skeleton className="inline-block w-20 h-4" />}</p>
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
                                className="flex-1"
                            >
                                Adicionar
                            </Button>
                            <Button
                                variant={!isAdding ? "default" : "outline"}
                                onClick={() => setIsAdding(false)}
                                className="flex-1"
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

