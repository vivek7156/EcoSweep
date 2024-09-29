//@ts-nocheck
'use client'
import { useState, useEffect, use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "./ui/button"
import { Menu, HandCoins, Sprout, Search, BellRing, User, ChevronDown, LogIn, LogOut } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Badge } from "./ui/badge"
import { Web3Auth } from "@web3auth/modal"
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider"
import { inet } from "drizzle-orm/pg-core"
import { createUser, getUnreadNotifications, getUserBalance, getUserByEmail, markNotificationAsRead } from "@/utils/db/actions"
import { useMediaQuery } from "@/hooks/useMediaQuery"

const clientId = process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
}

const privateKeyProvider = new EthereumPrivateKeyProvider({
    config:{ chainConfig },
})
const web3Auth = new Web3Auth({
    clientId,
    web3AuthNetwork:WEB3AUTH_NETWORK.TESTNET,
    privateKeyProvider
})
interface HeaderProps {
    onMenuClick: () => void;
    totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings}: HeaderProps){
    const [ provider, setProvider] = useState<IProvider | null>(null)
    const [ loggedIn, setLoggedIn] = useState(false)
    const [ loading, setLoading] = useState(true)
    const [ userInfo, setUserInfo] = useState<any>(null)
    const pathname = usePathname()
    const [ notification, setNotification] = useState<Notification[]>([])
    const [ balance, setBalance] = useState(0)
    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => {
        const init = async () => {
            try{
                await web3Auth.initModal();
                setProvider(web3Auth.provider)

                if(web3Auth.connected){
                    setLoggedIn(true)
                    const user = await web3Auth.getUserInfo();
                    setUserInfo(user)
                    if(user.email) {
                        localStorage.setItem('userEmail', user.email)
                        try{ 
                            await createUser(user.email, user.name || 'Anonymous user')
                        } catch(error) {
                            console.error('Error creating user', error)
                        }
                    }
                }
            } catch(error){
                console.error('Error initializing web3auth',error)
            } finally{
                setLoading(false)
            }
        }
        init()
    },[]);
    
    useEffect(() => {
        const fetchNotifications = async () => {
            if(userInfo && userInfo.email){
                const user = await getUserByEmail(userInfo.email)
                if(user){
                    const unreadNotifications = await getUnreadNotifications(user.id)
                    setNotification(unreadNotifications);
                }
            }
        }
        fetchNotifications();
        const notificationInterval = setInterval(fetchNotifications, 3000)
        return () => clearInterval(notificationInterval);
    }, [userInfo]);

    useEffect(() => {
        const fetchUserBalance = async () => {
            if(userInfo && userInfo.email){
                const user = await getUserByEmail(userInfo.email)
                if(user){
                    const userBalance = await getUserBalance(user.id)
                    setBalance(userBalance)
                }
            }
        }
        fetchUserBalance();
        const handleBalanceUpdate = (event: CustomEvent) => {
            setBalance(event.detail)
        }
        window.addEventListener('balaceUpdate', handleBalanceUpdate as EventListener);
        return () => {
            window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener)
        }
    }, [userInfo]);

    const login = async () => {
        if(!web3Auth){
            console.error('Web3Auth is not Initialized')
            return;
        }
        try{
            const web3authProvider = await web3Auth.connect();
            setProvider(web3authProvider)
            setLoggedIn(true)
            const user = await web3Auth.getUserInfo();
            setUserInfo(user)
            if(user.email){
                localStorage.setItem('userEmail', user.email)
                try{
                    await createUser(user.email, user.name || 'Anonymous User')
                } catch(error){
                    console.error('Error creating user', error)
                }
            }
        } catch(error){
            console.error('Error logging in', error)
        }
    };

    const logout = async () => {
        if(!web3Auth){
            console.error('Web3Auth is not Initialized')
            return;
        }
        try{
            await web3Auth.logout();
            setProvider(null)
            setLoggedIn(false)
            setUserInfo(null)
            localStorage.removeItem("userEmail");
        } catch(error){
            console.error('Error logging out', error)
        }
    };

    const getUserInfo = async () => {
        if(web3Auth.connected){
            const user = await web3Auth.getUserInfo()
            setUserInfo(user);
            if(user.email){
                localStorage.setItem('userEmail', user.email)
                try{
                    await createUser(user.email, user.name || 'Anonymous User')
                } catch(error){
                    console.error('Error creating user', error);
                }
            }
        }
    };

    const handleNotificationClick = async (notificationId: number) => {
        await markNotificationAsRead(notificationId);
    };
    if(loading){
        return <div>Loading web3 auth.....</div>;
    }
    return(
        <header className="bg-custom-darkgreen border-b border-gray-400 sticky top-0 z-50">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center">
                    <Button variant='ghost' size='icon' className="mr-2 md:mr-4 " onClick={onMenuClick}>
                        <Menu className="h-6 w-6 text-white" />
                    </Button>
                    <Link href='/' className="flex items-center">
                        <Sprout className="h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2"/>
                        <span className="text-base font-bold md:text-lg text-white ">EcoSweep</span>
                    </Link>
                </div>
                {!isMobile && (
                    <div className="flex-1 max-w-xl mx-4">
                        <div className="relative left-[9vw] w-[35vw]">
                            <input type="text" placeholder="search..." className="w-full px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-500 bg-gray-100" />
                            <Search className="absolute text-gray-500 right-3 top-1/2 transform -translate-y-1/2"/>
                        </div>
                    </div>
                )}
                <div className="flex items-center">
                    {isMobile && (
                        <Button variant='ghost' size='icon' className="mr-2">
                        <Search className="h-5 w-5" />
                    </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className="mr-2 relative">
                                <BellRing className="h-5 w-5 text-white" />
                                {notification.length > 0 && (
                                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5" >
                                        {notification.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            {notification.length > 0 ? (
                                notification.map((notification:any) => (
                                    <DropdownMenuItem
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification.id)}
                                    >
                                        <div className="flex flex-col">
                                            <span className=" font-medium">{notification.type}</span>
                                            <span className="text-sm text-gray-500">{notification.message}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem>No new notifications</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="mr-2 md:mr-4 flex items-center bg-gray-100 rounded-full px-2 md:px-3 py-1">
                        <HandCoins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-green-500" />
                        <span className="font-semibold text-sm md:text-base text-gray-800">
                            {balance.toFixed(2)}
                        </span>
                    </div>
                    {!loggedIn ? (
                        <Button onClick={login} className="bg-green-500 hover:bg-green-600 text-white text-sm md:text-base">
                            Login 
                            <LogIn className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon' className="items-center flex">
                                    <User className="h-5 w-5 mr-1 " />
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={getUserInfo}>
                                    {userInfo ? userInfo.name : 'Fetch user info'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/settings">Profile</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    );
}