import { useNavigate } from 'react-router-dom'
import { LayoutGrid, FileText, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function UserMenu({ login }) {
	const navigate = useNavigate()
	const logout = useAuthStore(state => state.logout)

	function handleLogout() {
		logout()
		navigate('/login')
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="group h-auto gap-0 px-1 py-1 hover:bg-transparent">
					<span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-accent text-muted-foreground transition-colors group-hover:text-foreground group-data-[state=open]:text-foreground">
						<User className="h-4 w-4" />
					</span>
					<span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-2.5 group-hover:max-w-48 group-hover:opacity-100 group-data-[state=open]:ml-2.5 group-data-[state=open]:max-w-48 group-data-[state=open]:opacity-100">
						{login}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuLabel>{login}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => navigate('/dashboard')}>
					<LayoutGrid />
					Мои доски
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => navigate('/documents')}>
					<FileText />
					Документы
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
					<LogOut />
					Выйти
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
