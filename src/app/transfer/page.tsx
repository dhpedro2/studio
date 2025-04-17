"use client";

import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function Transfer() {
  const [destinatarioEmail, setDestinatarioEmail] = useState("");
  const [valor, setValor] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const { toast } = useToast();
  const auth = getAuth();
  const db = getFirestore();
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [valorTransferencia, setValorTransferencia] = useState<number>(0);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [sameAccountOpen, setSameAccountOpen] = useState(false);

  // Store recipient info for use in success message
  const [successDestinatarioNome, setSuccessDestinatarioNome] = useState("");
  const [successDestinatarioEmail, setSuccessDestinatarioEmail] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      setUserId(auth.currentUser.uid);
    }
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchDestinatarioNome = async () => {
      if (destinatarioEmail) {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, where("email", "==", destinatarioEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setDestinatarioNome(userDoc.data().name || "");
        } else {
          setDestinatarioNome("Usuário não encontrado");
        }
      } else {
        setDestinatarioNome("");
      }
    };

    fetchDestinatarioNome();
  }, [destinatarioEmail, db]);

  useEffect(() => {
    const loadSaldo = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setSaldo(userDoc.data().saldo || 0);
        } else {
          setSaldo(0);
        }
      }
    };

    loadSaldo();
  }, [auth.currentUser, db]);

    useEffect(() => {
        if (auth.currentUser) {
            const userDocRef = doc(db, "users", auth.currentUser.uid);

            // Subscribe to real-time updates
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setSaldo(doc.data().saldo || 0);
                } else {
                    setSaldo(0);
                }
            });

            return () => unsubscribe();
        }
    }, [auth.currentUser, db]);

  const handleTransfer = async () => {
    if (!destinatarioEmail || !valor) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    const parsedValor = parseFloat(valor);

    if (isNaN(parsedValor) || parsedValor <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um valor válido para transferência.",
      });
      return;
    }

    // Check if sender and receiver are the same
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("email", "==", destinatarioEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const destinatarioDoc = querySnapshot.docs[0];
      if (userId === destinatarioDoc.id) {
        setValorTransferencia(parsedValor);
        setSuccessDestinatarioNome(destinatarioNome);
        setSuccessDestinatarioEmail(destinatarioEmail);
        setSameAccountOpen(true);
        return;
      }
    }

     // Check if sender has enough balance
      if (saldo === null || parsedValor > saldo) {
        setValorTransferencia(parsedValor);
        setSuccessDestinatarioNome(destinatarioNome);
        setSuccessDestinatarioEmail(destinatarioEmail);
        setInsufficientBalanceOpen(true);
        return;
      }

    setValorTransferencia(parsedValor);
    setSuccessDestinatarioNome(destinatarioNome);
    setSuccessDestinatarioEmail(destinatarioEmail);
    setOpen(true);
  };

  const confirmTransfer = async () => {
    setOpen(false);
    try {
      if (auth.currentUser) {
        const parsedValor = parseFloat(valor);

        // Get references to the sender and receiver documents
        const remetenteDocRef = doc(db, "users", userId!);

        const usersCollection = collection(db, "users");
        const q = query(usersCollection, where("email", "==", destinatarioEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Destinatário não encontrado.",
          });
          return;
        }

        const destinatarioDoc = querySnapshot.docs[0];
        const destinatarioDocRef = doc(db, "users", destinatarioDoc.id);

        // Check if sender and receiver are the same
        if (userId === destinatarioDoc.id) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Você não pode transferir para sua própria conta.",
          });
          return;
        }

        // Get sender and receiver data
        const remetenteDoc = await getDoc(remetenteDocRef);
        const destinatarioDocSnap = await getDoc(destinatarioDocRef);

        if (!remetenteDoc.exists() || !destinatarioDocSnap.exists()) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Remetente ou destinatário não encontrado.",
          });
          return;
        }

        let remetenteSaldo = remetenteDoc.data()?.saldo || 0;
        let destinatarioSaldo = destinatarioDocSnap.data()?.saldo || 0;

        // Check if sender has enough balance
        if (remetenteSaldo < parsedValor) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Saldo insuficiente.",
          });
          return;
        }

        // Perform the transfer
        remetenteSaldo -= parsedValor;
        destinatarioSaldo += parsedValor;

        // Update sender's balance
        await updateDoc(remetenteDocRef, {
          saldo: remetenteSaldo,
        });

        // Update receiver's balance
        await updateDoc(destinatarioDocRef, {
          saldo: destinatarioSaldo,
        });

        // Record the transaction
        const transactionData = {
          remetente: userId,
          destinatario: destinatarioDoc.id,
          valor: parsedValor,
          data: new Date().toISOString(),
        };
        await addDoc(collection(db, "transactions"), transactionData);

        // Store recipient info before clearing fields
        setSuccessDestinatarioNome(destinatarioNome);
        setSuccessDestinatarioEmail(destinatarioEmail);

        // Clear input fields
        setDestinatarioEmail("");
        setValor("");

        setSuccessOpen(true);
        setTransferSuccess(true);

        toast({
          title: "Transferência realizada com sucesso!",
          description: `R$ ${parsedValor} foi transferido para ${destinatarioNome} (${destinatarioEmail}).`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar a transferência",
        description: error.message,
      });
    }
  };

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
          <CardTitle>Realizar Transferência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-lg font-semibold">
              Saldo Atual: R$ {saldo !== null ? saldo.toFixed(2) : "Carregando..."}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="destinatario">Email do Destinatário</Label>
            <Input
              id="destinatario"
              type="email"
              placeholder="email@exemplo.com"
              value={destinatarioEmail}
              onChange={(e) => setDestinatarioEmail(e.target.value)}
            />
            {destinatarioNome && <p>Nome: {destinatarioNome}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor da Transferência</Label>
            <Input
              id="valor"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
           <Link href="/transferencias-antigas">
             <Button variant="secondary">Transferências Recentes</Button>
           </Link>
          <Button onClick={handleTransfer}>Transferir</Button>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmação de Transferência</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja transferir R$ {valor} para {destinatarioNome} ({destinatarioEmail})?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmTransfer}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {transferSuccess && (
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transferência realizada com sucesso!</AlertDialogTitle>
                  <AlertDialogDescription>
                    R$ {valorTransferencia} foi transferido para {successDestinatarioNome} ({successDestinatarioEmail}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => {
                    setSuccessOpen(false);
                    setTransferSuccess(false); // Reset the transferSuccess state
                  }}>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog open={insufficientBalanceOpen} onOpenChange={setInsufficientBalanceOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Saldo Insuficiente</AlertDialogTitle>
                <AlertDialogDescription>
                  Você não tem saldo suficiente para transferir R$ {valorTransferencia} para {successDestinatarioNome} ({successDestinatarioEmail}).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setInsufficientBalanceOpen(false)}>OK</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

           <AlertDialog open={sameAccountOpen} onOpenChange={setSameAccountOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transferência Inválida</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você não pode transferir para sua própria conta.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setSameAccountOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
