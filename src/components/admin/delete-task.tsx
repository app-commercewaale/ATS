"use client";

import { useState } from "react";
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Loader2, Trash2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import * as api from "@/lib/api";

export function DeleteTask({ task }: any) {

const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)

const { toast } = useToast()
const router = useRouter()

async function onDelete() {

setLoading(true)

try {

await api.deleteTask(task.id)

toast({
title: "Task Deleted",
description: `"${task.title}" was removed`
})

setOpen(false)

router.refresh()

} catch (error: any) {

toast({
title: "Error",
description: error.message,
variant: "destructive"
})

}

setLoading(false)

}

return (

<>

<DropdownMenuItem
onSelect={(e) => {
e.preventDefault()
setOpen(true)
}}
className="text-destructive"
>

<Trash2 className="mr-2 h-4 w-4" />

Delete Task

</DropdownMenuItem>

<AlertDialog open={open} onOpenChange={setOpen}>

<AlertDialogContent>

<AlertDialogHeader>

<AlertDialogTitle>

Delete Task

</AlertDialogTitle>

<AlertDialogDescription>

Are you sure you want to delete
<strong> "{task.title}" </strong> ?

</AlertDialogDescription>

</AlertDialogHeader>

<AlertDialogFooter>

<AlertDialogCancel>

Cancel

</AlertDialogCancel>

<AlertDialogAction
onClick={(e) => {
e.preventDefault()
onDelete()
}}
disabled={loading}
>

{loading && (
<Loader2 className="mr-2 h-4 w-4 animate-spin" />
)}

Delete

</AlertDialogAction>

</AlertDialogFooter>

</AlertDialogContent>

</AlertDialog>

</>

)

}