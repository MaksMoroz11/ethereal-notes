import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authText } from '@/shared/messages/auth'
import { usePrivacyStore } from '@/shared/store/privacyStore'

const LOGIN_PATTERN = /^[A-Za-z0-9_]+$/

export default function Login() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const register = useAuthStore(state => state.register)
	const login = useAuthStore(state => state.login)

	const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login')
	const [loginValue, setLoginValue] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [consent, setConsent] = useState(false)
	const [remember, setRemember] = useState(false)
	const privacy = usePrivacyStore(state => state.config)
	const loadPrivacy = usePrivacyStore(state => state.load)
	const privacyError = usePrivacyStore(state => state.error)
	useEffect(() => { if (mode === 'register' && !privacy) loadPrivacy() }, [mode, privacy, loadPrivacy])

	async function submit(e) {
		e.preventDefault()
		setError('')

		if (!LOGIN_PATTERN.test(loginValue)) {
			setError(authText.loginInvalid)
			return
		}
		if (mode === 'register' && password.length < 4) {
			setError(authText.passwordShort)
			return
		}

		setLoading(true)
		try {
			if (mode === 'register') {
				if (!consent) throw new Error(authText.consentRequired)
				await register(loginValue, password, { consent, consent_version: privacy.consent_version, remember })
			} else await login(loginValue, password, remember)
			navigate('/dashboard')
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12 animate-in fade-in duration-300">
			<div className="w-full max-w-md rounded-xl border border-border border-l-[3px] border-l-primary bg-card p-8 shadow-lg">
				<h1 className="mb-6 text-2xl font-bold text-foreground">
					{mode === 'login' ? authText.login : authText.register}
				</h1>

				<form className="flex flex-col gap-4" onSubmit={submit}>
					<div className="space-y-2">
						<Label htmlFor="login">{authText.loginLabel}</Label>
						<Input
							id="login"
							value={loginValue}
							autoFocus
							onChange={e => setLoginValue(e.target.value)}
							placeholder="latin_only"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">{authText.passwordLabel}</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="••••••"
						/>
					</div>

					<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />{authText.remember}</label>
					{mode === 'register' ? <div className="space-y-2 text-sm">
						<label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />{authText.consentLabel}</label>
						<p><Link to="/consent" target="_blank" className="text-primary underline">{authText.consentLink}</Link> · <Link to="/privacy" target="_blank" className="text-primary underline">{authText.policyLink}</Link></p>
						{privacyError ? <p className="text-destructive">{privacyError} <button type="button" className="underline" onClick={loadPrivacy}>{authText.retry}</button></p> : null}
					</div> : null}
					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button type="submit" disabled={loading || (mode === 'register' && (!consent || !privacy))} className="mt-2">
						{loading ? '…' : mode === 'login' ? authText.submitLogin : authText.submitRegister}
					</Button>
				</form>

				<Button
					type="button"
					variant="link"
					className="mt-4 px-0"
					onClick={() => {
						setMode(mode === 'login' ? 'register' : 'login')
						setError('')
						setConsent(false)
					}}
				>
					{mode === 'login' ? authText.switchRegister : authText.switchLogin}
				</Button>
			</div>
		</section>
	)
}
