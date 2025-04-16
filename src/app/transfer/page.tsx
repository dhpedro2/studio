"use client";

import { useState, useEffect } from "react";
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
  FieldValue,
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
  const { toast } = useToast();
  const auth = getAuth();
  const db = getFirestore();

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

  const handleTransfer = async () => {
    if (!destinatarioEmail || !valor) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    const valorTransferencia = parseFloat(valor);

    if (isNaN(valorTransferencia) || valorTransferencia <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um valor válido para transferência.",
      });
      return;
    }

    setOpen(true);
  };

  const confirmTransfer = async () => {
    setOpen(false);
    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;

        // Get references to the sender and receiver documents
        const remetenteDocRef = doc(db, "users", userId);

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
        if (remetenteSaldo < valorTransferencia) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Saldo insuficiente.",
          });
          return;
        }
  
        // Perform the transfer
        remetenteSaldo -= valorTransferencia;
        destinatarioSaldo += valorTransferencia;

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
            valor: valorTransferencia,
            data: new Date().toISOString(),
          };
          await collection(db, "transactions").add(transactionData);

        toast({
          title: "Transferência realizada com sucesso!",
          description: `R$ ${valorTransferencia.toFixed(
            2
          )} transferido para ${destinatarioNome} (${destinatarioEmail}).`,
        });

        setDestinatarioEmail("");
        setValor("");
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
    <div className="flex items-center justify-center h-screen bg-secondary">
      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle>Realizar Transferência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
