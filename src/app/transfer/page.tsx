
"use client";

import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  serverTimestamp,
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
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, Clock, User } from 'lucide-react';
import { useRouter } from "next/navigation";
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

const app = initializeApp(firebaseConfig);
const DUMMY_EMAIL_DOMAIN = "bank.zaca";


export default function Transfer() {
  const [destinatarioCallNumber, setDestinatarioCallNumber] = useState("");
  const [valor, setValor] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioUid, setDestinatarioUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const { toast } = useToast();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [valorTransferencia, setValorTransferencia] = useState<number>(0);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [sameAccountOpen, setSameAccountOpen] = useState(false);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [loadingDestinatario, setLoadingDestinatario] = useState(false);

  const [successDestinatarioNome, setSuccessDestinatarioNome] = useState("");
  const [successDestinatarioCallNumber, setSuccessDestinatarioCallNumber] = useState("");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          setLoadingSaldo(true);
          if (docSnap.exists()) {
            setSaldo(docSnap.data().saldo || 0);
          } else {
            setSaldo(0);
            toast({ variant: "destructive", title: "Erro", description: "Usuário não encontrado no banco de dados." });
            router.push("/");
          }
          setLoadingSaldo(false);
        }, (error) => {
          console.error("Error fetching real-time balance:", error);
          toast({ variant: "destructive", title: "Erro de Sincronização", description: "Não foi possível carregar o saldo." });
          setLoadingSaldo(false);
        });
        return () => unsubSnapshot();
      } else {
        router.push("/");
      }
    });
     return () => unsubscribe();
  }, [auth, db, router, toast]);


  useEffect(() => {
    const fetchDestinatarioNome = async () => {
      if (destinatarioCallNumber) {
        setLoadingDestinatario(true);
        setDestinatarioNome(""); // Clear previous name
        setDestinatarioUid(null);
        try {
          const usersCollection = collection(db, "users");
          const q = query(usersCollection, where("callNumber", "==", parseInt(destinatarioCallNumber)));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setDestinatarioNome(userDoc.data().fullName || "Nome não encontrado");
            setDestinatarioUid(userDoc.id);
          } else {
            setDestinatarioNome("Usuário não encontrado");
          }
        } catch (error) {
            console.error("Error fetching recipient details:", error);
            setDestinatarioNome("Erro ao buscar usuário");
        } finally {
            setLoadingDestinatario(false);
        }
      } else {
        setDestinatarioNome("");
        setDestinatarioUid(null);
      }
    };

    const debounceTimer = setTimeout(() => {
        if (destinatarioCallNumber) fetchDestinatarioNome();
    }, 500); // Add a small delay to avoid querying on every keystroke

    return () => clearTimeout(debounceTimer);
  }, [destinatarioCallNumber, db]);


  const handleTransfer = async () => {
    if (!destinatarioCallNumber || !valor) {
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
    
    if (!destinatarioUid || destinatarioNome === "Usuário não encontrado" || destinatarioNome === "Erro ao buscar usuário") {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Número da chamada do destinatário inválido ou não encontrado.",
        });
        return;
    }


    if (userId === destinatarioUid) {
      setValorTransferencia(parsedValor);
      setSuccessDestinatarioNome(destinatarioNome);
      setSuccessDestinatarioCallNumber(destinatarioCallNumber)
      setSameAccountOpen(true);
      return;
    }

    if (saldo === null || parsedValor > saldo) {
      setValorTransferencia(parsedValor);
      setSuccessDestinatarioNome(destinatarioNome);
      setSuccessDestinatarioCallNumber(destinatarioCallNumber);
      setInsufficientBalanceOpen(true);
      return;
    }

    setValorTransferencia(parsedValor);
    setSuccessDestinatarioNome(destinatarioNome);
    setSuccessDestinatarioCallNumber(destinatarioCallNumber);
    setOpen(true);
  };

  const confirmTransfer = async () => {
    setOpen(false);
    if (!auth.currentUser || !destinatarioUid || !userId) {
         toast({ variant: "destructive", title: "Erro", description: "Sessão inválida ou destinatário não encontrado." });
        return;
    }

    try {
      const parsedValor = parseFloat(valor);

      const remetenteDocRef = doc(db, "users", userId);
      const destinatarioDocRef = doc(db, "users", destinatarioUid);

      const remetenteDoc = await getDoc(remetenteDocRef);
      const destinatarioDocSnap = await getDoc(destinatarioDocRef);

      if (!remetenteDoc.exists() || !destinatarioDocSnap.exists()) {
        toast({ variant: "destructive", title: "Erro", description: "Remetente ou destinatário não encontrado." });
        return;
      }

      let remetenteSaldo = remetenteDoc.data()?.saldo || 0;
      let destinatarioSaldo = destinatarioDocSnap.data()?.saldo || 0;

      if (remetenteSaldo < parsedValor) {
        // This check is redundant if the initial check in handleTransfer is solid, but good for safety.
        setInsufficientBalanceOpen(true);
        return;
      }

      remetenteSaldo -= parsedValor;
      destinatarioSaldo += parsedValor;

      await updateDoc(remetenteDocRef, { saldo: remetenteSaldo });
      await updateDoc(destinatarioDocRef, { saldo: destinatarioSaldo });

      await addDoc(collection(db, "transactions"), {
        remetente: userId,
        destinatario: destinatarioUid,
        remetenteNome: remetenteDoc.data()?.fullName || "Remetente Desconhecido",
        destinatarioNome: destinatarioDocSnap.data()?.fullName || "Destinatário Desconhecido",
        valor: parsedValor,
        data: serverTimestamp(),
        tipo: "transferencia"
      });
      
      setSuccessDestinatarioNome(destinatarioDocSnap.data()?.fullName);
      setSuccessDestinatarioCallNumber(destinatarioCallNumber);

      setDestinatarioCallNumber("");
      setValor("");
      setDestinatarioNome("");
      setDestinatarioUid(null);

      setSuccessOpen(true);
      setTransferSuccess(true);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar a transferência",
        description: error.message,
      });
    }
  };
  

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
          Zaca Bank
        </h1>
      </div>
      <div className="flex justify-around w-full max-w-md mb-8 z-20 mobile-nav-buttons">
        <Button onClick={() => router.push("/dashboard")} variant="ghost" className="md:text-sm"><Home className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Início</span></Button>
        <Button onClick={() => router.push("/transfer")} variant="ghost" className="md:text-sm"><Wallet className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Transferências</span></Button>
        <Button onClick={() => router.push("/history")} variant="ghost" className="md:text-sm"><Clock className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Histórico</span></Button>
        <Button onClick={() => router.push("/profile")} variant="ghost" className="md:text-sm"><User className="mr-1 md:mr-2 h-5 w-5 md:h-auto md:w-auto" /><span>Perfil</span></Button>
      </div>
      <Separator className="w-full max-w-md mb-8 z-20" />

      <Card className="w-full max-w-md z-20 md:w-96">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center md:text-left">Realizar Transferência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 main-content">
           <div>
            <p className="text-lg font-semibold">
              Saldo Atual: Ƶ {loadingSaldo ? <Skeleton className="inline-block w-24 h-6" /> : (saldo !== null ? saldo.toFixed(2) : "0.00")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="destinatarioCallNumber">Número da Chamada do Destinatário</Label>
            <Input
              id="destinatarioCallNumber"
              type="number"
              placeholder="Ex: 14"
              value={destinatarioCallNumber}
              onChange={(e) => setDestinatarioCallNumber(e.target.value)}
              min="1"
              max="50"
            />
            {loadingDestinatario && <Skeleton className="h-4 w-32 mt-1" />}
            {!loadingDestinatario && destinatarioNome && <p className="text-sm text-muted-foreground mt-1">Nome: {destinatarioNome}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor da Transferência</Label>
            <Input
              id="valor"
              type="number"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
           
          <Button onClick={handleTransfer} className="md:text-sm">Transferir</Button>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmação de Transferência</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja transferir Ƶ {valorTransferencia.toFixed(2)} para {successDestinatarioNome} (Nº {successDestinatarioCallNumber})?
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
                    Ƶ {valorTransferencia.toFixed(2)} foi transferido para {successDestinatarioNome} (Nº {successDestinatarioCallNumber}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => {
                    setSuccessOpen(false);
                    setTransferSuccess(false); 
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
                  Você não tem saldo suficiente para transferir Ƶ {valorTransferencia.toFixed(2)} para {successDestinatarioNome} (Nº {successDestinatarioCallNumber}).
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

