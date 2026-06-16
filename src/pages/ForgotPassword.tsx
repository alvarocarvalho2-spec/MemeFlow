import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

export function ForgotPassword() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();
  async function onSubmit({ email }: { email: string }) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/profile/edit` });
    if (error) return toast.error(error.message);
    toast.success('Link de recuperação enviado para seu email.');
  }
  return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-3xl text-gradient">Recuperar senha</CardTitle><CardDescription>Enviaremos um link seguro para redefinição.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit(onSubmit)}><Input type="email" placeholder="email@exemplo.com" {...register('email', { required: true })} /><Button className="w-full" variant="gradient" disabled={isSubmitting}>Enviar link</Button></form><Link className="mt-4 block text-sm text-primary hover:underline" to="/login">Voltar ao login</Link></CardContent></Card></div>;
}
