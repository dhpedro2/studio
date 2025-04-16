"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
          setSaldo(docSnap.data().saldo || 0);
        } else {
          console.log("No such document!");
          setSaldo(0);
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [auth, db, router]);

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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-secondary">
      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle>Painel do Usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-lg font-semibold">
              Saldo Atual: R$ {saldo !== null ? saldo.toFixed(2) : "Carregando..."}
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button onClick={() => router.push("/transfer")}>
              Realizar Transferência
            </Button>
            <Button onClick={() => router.push("/history")}>
              Histórico de Transações
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
