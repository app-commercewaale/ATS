"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, Send, Info } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  type: z.string().min(1, "Please select a leave type."),
});

export function LeaveRequest({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await api.submitLeaveRequest({
        employeeId,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        type: values.type,
      });
      
      toast({
        title: "Request Sent",
        description: "Your leave request has been sent for approval.",
      });
      form.reset();
      router.refresh();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Could not submit leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = startOfToday();

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Request Absence</CardTitle>
        <CardDescription>Submit dates for vacation or personal leave.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-tight">From</FormLabel>
                    <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-muted/20 border-muted-foreground/10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "MMM d, yyyy") : <span>Start date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setIsStartPopoverOpen(false);
                            }
                          }}
                          disabled={(date) => date < today}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-tight">To</FormLabel>
                    <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-muted/20 border-muted-foreground/10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "MMM d, yyyy") : <span>End date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setIsEndPopoverOpen(false);
                            }
                          }}
                          disabled={(date) => date < (form.getValues('startDate') || today)}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-tight">
                    Leave Type
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/20 border-muted-foreground/10">
                        <SelectValue placeholder="Select Leave Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                      <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <Alert className="bg-primary/5 border-primary/20 p-3">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-[10px] leading-snug">
                  Submitted requests are immediately logged and synchronized with the administration's master database.
                </AlertDescription>
              </div>
            </Alert>

            <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}