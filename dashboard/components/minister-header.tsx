"use client"

import { Bell, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function MinisterHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between px-6 lg:px-8 h-16">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search schools, regions, or policies" className="pl-10 bg-background" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-sm">
              <p className="font-medium leading-none">Minister of Education</p>
              <p className="text-xs text-muted-foreground mt-0.5">Government Official</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  )
}
