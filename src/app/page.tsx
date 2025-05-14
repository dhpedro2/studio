
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initializeApp } from "firebase/app";
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

initializeApp(firebaseConfig);
const DUMMY_EMAIL_DOMAIN = "bank.zaca";

export default function Home() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [callNumber, setCallNumber] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [availableCallNumbers, setAvailableCallNumbers] = useState<number[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchAvailableNumbers = async () => {
      try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);
        const existingNumbers = usersSnapshot.docs.map(doc => doc.data().callNumber as number);
        const allNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
        const available = allNumbers.filter(num => !existingNumbers.includes(num));
        setAvailableCallNumbers(available);
      } catch (error) {
        console.error("Error fetching available call numbers:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar números disponíveis",
          description: "Tente recarregar a página.",
        });
      }
    };
    if (isRegistering) {
      fetchAvailableNumbers();
    }
  }, [isRegistering, db, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!callNumber) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione ou insira seu número da chamada.",
      });
      return;
    }

    const dummyEmail = `${callNumber}@${DUMMY_EMAIL_DOMAIN}`;

    if (isRegistering) {
      if (!fullName) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira seu nome completo.",
        });
        return;
      }
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "As senhas não coincidem.",
        });
        return;
      }

      try {
        // Check if callNumber is already taken (double check, although dropdown should prevent this)
        const q = query(collection(db, "users"), where("callNumber", "==", parseInt(callNumber)));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Este número da chamada já está em uso.",
            });
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, password);
        const user = userCredential.user;

        if (user) {
          await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            callNumber: parseInt(callNumber),
            email: dummyEmail, // Store the dummy email
            saldo: 0,
            saldoCaixinha: 0, // Initialize saldoCaixinha
            isAdmin: false,
            createdAt: new Date().toISOString(),
            cpf: "", // Initialize cpf field
          });

          toast({
            title: "Conta criada com sucesso!",
            description: "Redirecionando para o painel...",
          });
          router.push("/dashboard");
        }
      } catch (error: any) {
        console.error("Erro no registro:", error);
        let errorMessage = "Erro ao criar conta.";
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = "Este número da chamada (ou o email derivado) já está em uso.";
           // Re-fetch available numbers as a safety measure
          const usersCollectionRef = collection(db, "users");
          const usersSnapshot = await getDocs(usersCollectionRef);
          const existingNumbers = usersSnapshot.docs.map(doc => doc.data().callNumber as number);
          const allNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
          const available = allNumbers.filter(num => !existingNumbers.includes(num));
          setAvailableCallNumbers(available);
        } else if (error.code === 'auth/weak-password') {
          errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
        }
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: errorMessage,
        });
      }
    } else { // Login
      try {
        await signInWithEmailAndPassword(auth, dummyEmail, password);
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel...",
        });
        router.push("/dashboard");
      } catch (error: any) {
        console.error("Erro no login:", error);
        let errorMessage = "Erro ao realizar o login.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
          errorMessage = "Número da chamada ou senha inválidos.";
          setPassword("");
        }
        toast({
          variant: "destructive",
          title: "Erro ao realizar o login",
          description: errorMessage,
        });
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen">
      <video
        src="https://static.moewalls.com/videos/preview/2023/pink-wave-sunset-preview.webm"
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10"/>
      <Card className="w-96 z-20 max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center py-2">
            <h1 className="text-4xl font-semibold text-purple-500 drop-shadow-lg wave" style={{ fontFamily: 'Dancing Script, cursive' }}>
             Zaca Bank
            </h1>
          </div>
          <CardTitle className="text-2xl">{isRegistering ? "Criar Conta" : "Entrar"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 main-content">
          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="callNumber">Número da Chamada</Label>
              {isRegistering ? (
                <Select onValueChange={setCallNumber} value={callNumber} required>
                  <SelectTrigger id="callNumber">
                    <SelectValue placeholder="Selecione seu número" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCallNumbers.length > 0 ? (
                      availableCallNumbers.map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_numbers_available" disabled>Nenhum número disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="callNumber"
                  type="number"
                  placeholder="Seu número da chamada"
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  min="1"
                  max="50"
                  required
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isRegistering && (
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full mt-4">
              {isRegistering ? "Criar Conta" : "Entrar"}
            </Button>
          </form>
          <div className="flex justify-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                // Clear fields on mode switch
                setCallNumber("");
                setFullName("");
                setPassword("");
                setConfirmPassword("");
              }}
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
