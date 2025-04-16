"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA",
  authDomain: "bank-dh.firebaseapp.com",
  projectId: "bank-dh",
  storageBucket: "bank-dh.firebasestorage.app",
  messagingSenderId: "370634468884",
  appId: "1:370634468884:web:4a00ea2f9757051cda4101",
  measurementId: "G-JPFXDJBSGM",
};

initializeApp(firebaseConfig);

export default function Home() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: "Conta criada com sucesso!",
          description: "Redirecionando para o painel...",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel...",
        });
      }
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        variant: "destructive",
        title: "Erro ao realizar a operação",
        description: error.message,
      });
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-secondary">
      <Card className="w-96">
        <CardHeader className="space-y-1">
          <CardTitle>{isRegistering ? "Criar Conta" : "Entrar"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full mt-4">
              {isRegistering ? "Criar Conta" : "Entrar"}
            </Button>
          </form>
          <div className="flex justify-center">
            <Button
              variant="link"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering
                ? "Já possui uma conta? Entrar"
                : "Não possui uma conta? Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
