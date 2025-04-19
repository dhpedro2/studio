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
import { Skeleton } from "@/components/ui/skeleton";
import '@/app/globals.css';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ThemeProvider } from "@/components/ui/theme-provider";

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
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [pixCode, setPixCode] = useState<string>("");
    const [isCPFModalOpen, setIsCPFModalOpen] = useState(false);
    const [cpf, setCPF] = useState<string>("");
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
    const [isWithdrawConfirmationModalOpen, setIsWithdrawConfirmationModalOpen] = useState(false);
    const [pixKey, setPixKey] = useState<string>("");
    const [isPixKeyModalOpen, setIsPixKeyModalOpen] = useState(false);


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

    const handleSelectAmount = (amount: number) => {
        setSelectedAmount(amount);
        setIsConfirmationModalOpen(true);
        let pixCodeValue = "";
        if (amount === 1) {
            pixCodeValue = "00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654041.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr15730379126831036304591C";
        } else if (amount === 5) {
            pixCodeValue = "00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654045.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791289395463044C46";
        } else if (amount === 10) {
            pixCodeValue = "00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d3520400005303986540510.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791203347963043786";
        }
        setPixCode(pixCodeValue);
    };

    const handleCopyCode = async (pixCode: string) => {
         try {
            await navigator.clipboard.writeText(pixCode);
            toast({
                title: "Código Pix copiado!",
                description: "O código Pix foi copiado para a área de transferência."
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Erro ao copiar código Pix",
                description: "Por favor, tente novamente."
            });
        }
    };

        const handleConfirmDeposit = async () => {
            setIsConfirmationModalOpen(false);
            setIsCPFModalOpen(true);
        };

        const handleSendCPF = async () => {
            if (!cpf) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Por favor, insira seu CPF.",
                });
                return;
            }

            try {
                if (auth.currentUser) {
                    const userDocRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userDocRef, {
                        cpf: cpf,
                    });

                    toast({
                        title: "CPF enviado com sucesso!",
                        description: "Aguarde a confirmação do depósito.",
                    });
                    setIsCPFModalOpen(false);
                }
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Erro ao enviar CPF",
                    description: error.message,
                });
            }
        };

        const handleSelectWithdrawAmount = () => {
            setIsWithdrawConfirmationModalOpen(true);
        };

        const handleConfirmWithdraw = () => {
            setIsWithdrawConfirmationModalOpen(false);
            setIsPixKeyModalOpen(true);
        };

        const handleSendWithdrawRequest = async () => {
            if (!pixKey) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Por favor, insira sua Chave Pix.",
                });
                return;
            }

            if (auth.currentUser && withdrawAmount !== null && saldo !== null) {
                if (withdrawAmount > saldo) {
                    toast({
                        variant: "destructive",
                        title: "Saldo insuficiente",
                        description: "Você não tem saldo suficiente para sacar este valor.",
                    });
                    setIsPixKeyModalOpen(false);
                    return;
                }

                try {
                    // Send notification to Discord webhook
                    const webhookBody = {
                        content: `Novo pedido de saque:\nUsuário: ${auth.currentUser.email}\nData: ${new Date().toLocaleString()}\nValor: R$${withdrawAmount}\nChave Pix: ${pixKey}`
                    };

                    const webhookUrl = "https://discord.com/api/webhooks/1363289919480528987/MAW66tTBzQXeuFYki7X3zN7VF74KuxdJgnIiujhFerQuFXS5aHElG_aa6cwupr2uhEfZ";

                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(webhookBody),
                    });

                    if (response.ok) {
                         // Subtract the withdrawn amount from the user's balance
                        const userDocRef = doc(db, "users", auth.currentUser.uid);
                        const currentSaldo = saldo;  // Use the state variable directly
                        const newSaldo = currentSaldo - withdrawAmount;

                        await updateDoc(userDocRef, {
                            saldo: newSaldo,
                        });

                        toast({
                            title: "Pedido de saque enviado!",
                            description: "Seu pedido de saque foi enviado para análise. Aguarde a confirmação.",
                        });
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Erro ao enviar pedido de saque",
                            description: "Ocorreu um erro ao enviar o pedido. Por favor, tente novamente.",
                        });
                    }

                    setIsPixKeyModalOpen(false);
                    setPixKey("");

                } catch (error: any) {
                    toast({
                        variant: "destructive",
                        title: "Erro ao enviar pedido de saque",
                        description: error.message,
                    });
                }
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
                    DH Bank
                </h1>
            </div>
            {/* Navigation Buttons */}
            <div className="flex justify-around w-full max-w-md mb-8 z-20">
                <Button onClick={() => router.push("/dashboard")} variant="ghost"><Home className="mr-2" />Início</Button>
                <Button onClick={() => router.push("/transfer")} variant="ghost"><Wallet className="mr-2" />Transferências</Button>
                <Button onClick={() => router.push("/history")} variant="ghost"><Clock className="mr-2" />Histórico</Button>
                <Button onClick={() => router.push("/profile")} variant="ghost"><User className="mr-2" />Perfil</Button>
            </div>
            <Separator className="w-full max-w-md mb-8 z-20" />

            <Card className="w-96 z-20">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl">Painel do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div>
                        <p className="text-3xl font-semibold">
                            Saldo Atual: R$ {loading ? <Skeleton width={150} /> : (saldo !== null ? saldo.toFixed(2) : "0.00")}
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
                        <Button onClick={() => setIsDepositModalOpen(true)} variant="outline">
                            <Upload className="mr-2" />
                            Depositar via Pix
                        </Button>
                        <Button onClick={() => setIsWithdrawModalOpen(true)} variant="outline">
                            <Download className="mr-2" />
                            Sacar via Pix
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
            <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Depositar via Pix</DialogTitle>
                        <DialogDescription>
                            Selecione o valor que deseja depositar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        <div>
                            <Button variant="outline" className="w-full" onClick={() => handleSelectAmount(1)}>R$ 1</Button>
                        </div>
                        <div>
                            <Button variant="outline" className="w-full" onClick={() => handleSelectAmount(5)}>R$ 5</Button>
                        </div>
                        <div>
                            <Button variant="outline" className="w-full" onClick={() => handleSelectAmount(10)}>R$ 10</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmationModalOpen} onOpenChange={setIsConfirmationModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Depósito</DialogTitle>
                        <DialogDescription>
                            Por favor, copie o código de pagamento para o depósito de R$ {selectedAmount}.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAmount === 1 && (
                        <div className="p-4 border rounded-md">
                            <p className="font-semibold">Chave Pix (Copiar e Colar):</p>
                            <Input
                                type="text"
                                value="00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654041.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr15730379126831036304591C"
                                readOnly
                                className="mb-2"
                            />
                            <Button variant="outline" size="sm" onClick={() => {
                                navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654041.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr15730379126831036304591C");
                                toast({
                                    title: "Código Pix copiado!",
                                    description: "O código Pix de R$ 1 foi copiado para a área de transferência."
                                });
                            }}>Copiar Código Pix</Button>
                            <Button type="button" onClick={() => handleConfirmDeposit()}>
                                Pronto
                            </Button>
                        </div>
                    )}

                    {selectedAmount === 5 && (
                        <div className="p-4 border rounded-md">
                            <p className="font-semibold">Chave Pix (Copiar e Colar):</p>
                            <Input
                                type="text"
                                value="00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654045.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791289395463044C46"
                                readOnly
                                className="mb-2"
                            />
                            <Button variant="outline" size="sm" onClick={() => {
                                navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d352040000530398654045.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791289395463044C46");
                                toast({
                                    title: "Código Pix copiado!",
                                    description: "O código Pix de R$ 5 foi copiado para a área de transferência."
                                });
                            }}>Copiar Código Pix</Button>
                            <Button type="button" onClick={() => handleConfirmDeposit()}>
                                Pronto
                            </Button>
                        </div>
                    )}

                    {selectedAmount === 10 && (
                        <div className="p-4 border rounded-md">
                            <p className="font-semibold">Chave Pix (Copiar e Colar):</p>
                            <Input
                                type="text"
                                value="00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d3520400005303986540510.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791203347963043786"
                                readOnly
                                className="mb-2"
                            />
                            <Button variant="outline" size="sm" onClick={() => {
                                navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136eef1060a-381c-4977-9d39-a2b57faf51d3520400005303986540510.005802BR5924Pedro Vinicius Oliveira 6008Brasilia62240520daqr157303791203347963043786");
                                toast({
                                    title: "Código Pix copiado!",
                                    description: "O código Pix de R$ 10 foi copiado para a área de transferência."
                                });
                            }}>Copiar Código Pix</Button>
                            <Button type="button" onClick={() => handleConfirmDeposit()}>
                                Pronto
                            </Button>
                        </div>
                    )}

                    
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsConfirmationModalOpen(false)}>
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isCPFModalOpen} onOpenChange={setIsCPFModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Depósito</DialogTitle>
                        <DialogDescription>
                            Para confirmar o depósito, por favor, insira seu CPF.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        <Label htmlFor="cpf">CPF:</Label>
                        <Input
                            id="cpf"
                            type="text"
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={(e) => setCPF(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => handleSendCPF()}>
                            Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sacar via Pix</DialogTitle>
                        <DialogDescription>
                            Digite o valor que deseja sacar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        <Label htmlFor="withdrawAmount">Valor do Saque:</Label>
                        <Input
                            id="withdrawAmount"
                            type="number"
                            placeholder="Valor a sacar"
                            value={withdrawAmount || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                const parsedValue = value === "" ? null : parseFloat(value);
                                setWithdrawAmount(parsedValue);
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => {
                            if (withdrawAmount === null) {
                                toast({
                                    variant: "destructive",
                                    title: "Erro",
                                    description: "Por favor, insira um valor válido.",
                                });
                                return;
                            }
                            if (withdrawAmount > (saldo || 0)) {
                                toast({
                                    variant: "destructive",
                                    title: "Saldo insuficiente",
                                    description: "Você não tem saldo suficiente para sacar este valor.",
                                });
                                return;
                            }
                            handleSelectWithdrawAmount();
                        }}>
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawConfirmationModalOpen} onOpenChange={setIsWithdrawConfirmationModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Saque</DialogTitle>
                        <DialogDescription>
                            Você está prestes a sacar R$ {withdrawAmount}. Confirme para continuar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsWithdrawConfirmationModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={() => handleConfirmWithdraw()}>
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPixKeyModalOpen} onOpenChange={setIsPixKeyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chave Pix</DialogTitle>
                        <DialogDescription>
                            Por favor, insira sua Chave Pix para receber o saque.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        <Label htmlFor="pixKey">Chave Pix:</Label>
                        <Input
                            id="pixKey"
                            type="text"
                            placeholder="Sua chave Pix"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={async () => {
                            if (!pixKey) {
                                toast({
                                    variant: "destructive",
                                    title: "Erro",
                                    description: "Por favor, insira sua Chave Pix.",
                                });
                                return;
                            }

                            if (auth.currentUser && withdrawAmount !== null && saldo !== null) {
                                if (withdrawAmount > saldo) {
                                    toast({
                                        variant: "destructive",
                                        title: "Saldo insuficiente",
                                        description: "Você não tem saldo suficiente para sacar este valor.",
                                    });
                                    setIsPixKeyModalOpen(false);
                                    return;
                                }

                                try {
                                    // Send notification to Discord webhook
                                    const webhookBody = {
                                        content: `Novo pedido de saque:\nUsuário: ${auth.currentUser.email}\nData: ${new Date().toLocaleString()}\nValor: R$${withdrawAmount}\nChave Pix: ${pixKey}`
                                    };

                                    const webhookUrl = "https://discord.com/api/webhooks/1363289919480528987/MAW66tTBzQXeuFYki7X3zN7VF74KuxdJgnIiujhFerQuFXS5aHElG_aa6cwupr2uhEfZ";

                                    const response = await fetch(webhookUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(webhookBody),
                                    });

                                    if (response.ok) {
                                        // Subtract the withdrawn amount from the user's balance
                                        const userDocRef = doc(db, "users", auth.currentUser.uid);
                                        const currentSaldo = saldo;
                                        const newSaldo = currentSaldo - withdrawAmount;

                                        await updateDoc(userDocRef, {
                                            saldo: newSaldo,
                                        });

                                        toast({
                                            title: "Pedido de saque enviado!",
                                            description: "Seu pedido de saque foi enviado para análise. Aguarde a confirmação.",
                                        });
                                    } else {
                                        toast({
                                            variant: "destructive",
                                            title: "Erro ao enviar pedido de saque",
                                            description: "Ocorreu um erro ao enviar o pedido. Por favor, tente novamente.",
                                        });
                                    }

                                    setIsPixKeyModalOpen(false);
                                    setPixKey("");

                                } catch (error: any) {
                                    toast({
                                        variant: "destructive",
                                        title: "Erro ao enviar pedido de saque",
                                        description: error.message,
                                    });
                                }
                            }
                        }}>
                            Sacar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

