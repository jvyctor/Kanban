"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";

type AuthMode = "login" | "register";

type PasswordFieldProps = {
  value: string;
  placeholder: string;
  showPassword: boolean;
  toggle: () => void;
  onChange: (value: string) => void;
};

type IconFieldProps = {
  icon: ReactNode;
  type: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

type Props = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  message: string | null;
  error: string | null;
  resetToken: string;
  loginForm: { email: string; password: string };
  setLoginForm: Dispatch<SetStateAction<{ email: string; password: string }>>;
  registerForm: {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  setRegisterForm: Dispatch<
    SetStateAction<{
      displayName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }>
  >;
  resetPasswordForm: { password: string; confirmPassword: string };
  setResetPasswordForm: Dispatch<SetStateAction<{ password: string; confirmPassword: string }>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  showRegisterPassword: boolean;
  setShowRegisterPassword: Dispatch<SetStateAction<boolean>>;
  showRegisterConfirm: boolean;
  setShowRegisterConfirm: Dispatch<SetStateAction<boolean>>;
  rememberPassword: boolean;
  setRememberPassword: Dispatch<SetStateAction<boolean>>;
  forgotPasswordOpen: boolean;
  setForgotPasswordOpen: Dispatch<SetStateAction<boolean>>;
  forgotPasswordEmail: string;
  setForgotPasswordEmail: Dispatch<SetStateAction<string>>;
  saving: string | null;
  authenticate: (path: "/auth/login" | "/auth/register", body: object) => Promise<void>;
  handleRegister: () => Promise<void>;
  requestPasswordReset: () => Promise<void>;
  confirmPasswordReset: () => Promise<void>;
};

function FieldLabel({ title }: { title: string }) {
  return <label className="mb-2 block text-sm font-medium text-slate-900">{title}</label>;
}

function IconField(props: IconFieldProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        {props.icon}
      </span>
      <input
        className="h-13 w-full rounded-2xl border border-slate-200 bg-white/80 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400/50 focus:bg-white focus:ring-4 focus:ring-sky-400/10"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type}
        value={props.value}
      />
    </div>
  );
}

function PasswordField(props: PasswordFieldProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        <Lock size={18} />
      </span>
      <input
        className="h-13 w-full rounded-2xl border border-slate-200 bg-white/80 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400/50 focus:bg-white focus:ring-4 focus:ring-sky-400/10"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.showPassword ? "text" : "password"}
        value={props.value}
      />
    <button
        className="absolute inset-y-0 right-4 flex items-center text-slate-400 transition hover:text-slate-900"
        onClick={props.toggle}
        type="button"
      >
        {props.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function SubmitButton(props: { busy: boolean; label: string; onClick: () => void }) {
  return (
      <motion.button
      className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-semibold text-white shadow-[0_0_28px_rgba(59,130,246,0.22)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={props.busy}
      onClick={props.onClick}
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {props.busy ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      ) : (
        <>
          <span>{props.label}</span>
          <ArrowRight size={18} />
        </>
      )}
    </motion.button>
  );
}

export function AuthScreen(props: Props) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef5ff] px-4 py-8 text-slate-950">
      <div className="absolute inset-0">
        <div className="absolute left-[10%] top-[14%] h-80 w-80 rounded-full bg-sky-400/18 blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] h-80 w-80 rounded-full bg-blue-400/14 blur-3xl animate-pulse [animation-delay:1200ms]" />
        <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -14 }}
            transition={{ delay: 0.12 }}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-200 bg-white/75 text-sky-600 shadow-[0_0_26px_rgba(59,130,246,0.14)] backdrop-blur-xl">
              <Sparkles size={28} />
            </div>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-950">Kanban Pro</h1>
            <p className="text-sm text-slate-600">Gerencie seus projetos de forma inteligente</p>
          </motion.div>

          <motion.article
            layout
            className="rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-[0_24px_80px_rgba(59,130,246,0.12)] backdrop-blur-2xl"
          >
            {!props.resetToken ? (
              <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/85 p-1.5">
                <button
                  className={`h-12 rounded-xl text-sm font-medium transition ${
                    props.mode === "login"
                      ? "bg-sky-500 text-white shadow-[0_12px_28px_rgba(59,130,246,0.22)]"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                  onClick={() => props.setMode("login")}
                  type="button"
                >
                  Entrar
                </button>
                <button
                  className={`h-12 rounded-xl text-sm font-medium transition ${
                    props.mode === "register"
                      ? "bg-sky-500 text-white shadow-[0_12px_28px_rgba(59,130,246,0.22)]"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                  onClick={() => props.setMode("register")}
                  type="button"
                >
                  Criar conta
                </button>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {props.resetToken ? (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                  initial={{ opacity: 0, x: 16 }}
                  key="reset"
                >
                  <FieldLabel title="Nova senha" />
                  <PasswordField
                    onChange={(value) =>
                      props.setResetPasswordForm((current) => ({ ...current, password: value }))
                    }
                    placeholder="Sua nova senha"
                    showPassword={props.showRegisterPassword}
                    toggle={() => props.setShowRegisterPassword((current) => !current)}
                    value={props.resetPasswordForm.password}
                  />
                  <FieldLabel title="Confirmar senha" />
                  <PasswordField
                    onChange={(value) =>
                      props.setResetPasswordForm((current) => ({
                        ...current,
                        confirmPassword: value
                      }))
                    }
                    placeholder="Confirme a nova senha"
                    showPassword={props.showRegisterConfirm}
                    toggle={() => props.setShowRegisterConfirm((current) => !current)}
                    value={props.resetPasswordForm.confirmPassword}
                  />
                  <SubmitButton
                    busy={props.saving === "confirm-password-reset"}
                    label="Salvar nova senha"
                    onClick={() => void props.confirmPasswordReset()}
                  />
                </motion.div>
              ) : props.mode === "login" ? (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                  initial={{ opacity: 0, x: -16 }}
                  key="login"
                >
                  <div>
                    <FieldLabel title="Email" />
                    <IconField
                      icon={<Mail size={18} />}
                      onChange={(value) =>
                        props.setLoginForm((current) => ({ ...current, email: value }))
                      }
                      placeholder="seu@email.com"
                      type="email"
                      value={props.loginForm.email}
                    />
                  </div>

                  <div>
                    <FieldLabel title="Senha" />
                    <PasswordField
                      onChange={(value) =>
                        props.setLoginForm((current) => ({ ...current, password: value }))
                      }
                      placeholder="Sua senha"
                      showPassword={props.showPassword}
                      toggle={() => props.setShowPassword((current) => !current)}
                      value={props.loginForm.password}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-400">
                      <input
                        checked={props.rememberPassword}
                        className="h-4 w-4 rounded border-slate-300 bg-white accent-sky-500"
                        onChange={(event) => props.setRememberPassword(event.target.checked)}
                        type="checkbox"
                      />
                      <span>Lembrar-me</span>
                    </label>
                    <button
                      className="text-sm text-sky-600 transition hover:text-sky-500"
                      onClick={() => props.setForgotPasswordOpen((current) => !current)}
                      type="button"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <AnimatePresence>
                    {props.forgotPasswordOpen ? (
                      <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                        initial={{ opacity: 0, height: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <IconField
                          icon={<Mail size={18} />}
                          onChange={props.setForgotPasswordEmail}
                          placeholder="Seu email"
                          type="email"
                          value={props.forgotPasswordEmail}
                        />
                        <div className="flex items-center gap-3">
                          <button
                            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400"
                            disabled={props.saving === "request-password-reset"}
                            onClick={() => void props.requestPasswordReset()}
                            type="button"
                          >
                            Enviar link
                          </button>
                          <button
                            className="text-sm text-slate-500 transition hover:text-slate-900"
                            onClick={() => props.setForgotPasswordOpen(false)}
                            type="button"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <SubmitButton
                    busy={props.saving === "/auth/login"}
                    label="Entrar"
                    onClick={() => void props.authenticate("/auth/login", props.loginForm)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                  initial={{ opacity: 0, x: 16 }}
                  key="register"
                >
                  <div>
                    <FieldLabel title="Nome completo" />
                    <IconField
                      icon={<User size={18} />}
                      onChange={(value) =>
                        props.setRegisterForm((current) => ({ ...current, displayName: value }))
                      }
                      placeholder="Seu nome"
                      type="text"
                      value={props.registerForm.displayName}
                    />
                  </div>
                  <div>
                    <FieldLabel title="Email" />
                    <IconField
                      icon={<Mail size={18} />}
                      onChange={(value) =>
                        props.setRegisterForm((current) => ({ ...current, email: value }))
                      }
                      placeholder="seu@email.com"
                      type="email"
                      value={props.registerForm.email}
                    />
                  </div>
                  <div>
                    <FieldLabel title="Senha" />
                    <PasswordField
                      onChange={(value) =>
                        props.setRegisterForm((current) => ({ ...current, password: value }))
                      }
                      placeholder="Crie sua senha"
                      showPassword={props.showRegisterPassword}
                      toggle={() => props.setShowRegisterPassword((current) => !current)}
                      value={props.registerForm.password}
                    />
                  </div>
                  <div>
                    <FieldLabel title="Confirmar senha" />
                    <PasswordField
                      onChange={(value) =>
                        props.setRegisterForm((current) => ({
                          ...current,
                          confirmPassword: value
                        }))
                      }
                      placeholder="Confirme sua senha"
                      showPassword={props.showRegisterConfirm}
                      toggle={() => props.setShowRegisterConfirm((current) => !current)}
                      value={props.registerForm.confirmPassword}
                    />
                  </div>

                  <SubmitButton
                    busy={props.saving === "/auth/register"}
                    label="Criar conta"
                    onClick={() => void props.handleRegister()}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {props.message ? <p className="mt-5 text-sm text-sky-600">{props.message}</p> : null}
            {props.error ? <p className="mt-5 text-sm text-rose-500">{props.error}</p> : null}

            {!props.resetToken ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                Entre com email e senha para acessar seu workspace.
              </p>
            ) : null}
          </motion.article>
        </motion.div>
      </div>
    </section>
  );
}
