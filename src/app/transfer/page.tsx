"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Transfer() {
  const [destinatario, setDestinatario] = useState("");
  const [valor, setValor] = useState("");
  const { toast } = useToast();
  const auth = getAuth();
  const db = getFirestore();

  const handleTransfer = async () => {
    if (!destinatario || !valor) {
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

    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;

        const userDocRef = doc(db, "users", userId);
        const destinatarioDocRef = doc(db, "users", destinatario);

        // Update sender's balance
        await updateDoc(userDocRef, {
          saldo: 100,
        });

        // Update receiver's balance
        await updateDoc(destinatarioDocRef, {
          saldo: 200,
        });

        toast({
          title: "Transferência realizada com sucesso!",
          description: `R$ ${valorTransferencia.toFixed(
            2
          )} transferido para ${destinatario}.`,
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
    <div className="flex items-center justify-center h-screen bg-secondary">
      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle>Realizar Transferência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="destinatario">ID do Destinatário</Label>
            <Input
              id="destinatario"
              placeholder="ID do usuário destinatário"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
            />
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
        </CardContent>
      </Card>
    </div>
  );
}
