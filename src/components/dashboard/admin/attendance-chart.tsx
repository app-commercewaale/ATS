"use client";

import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import * as api from '@/lib/api';
import { Attendance } from '@/lib/types';
import { format, startOfToday, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  office: {
    label: 'Office',
    color: 'hsl(var(--chart-1))',
  },
  wfh: {
    label: 'WFH',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function AttendanceChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processAttendanceData = (attendanceData: Attendance[]) => {
      const today = startOfToday();
      const processedData: { [key: string]: { date: string, office: number, wfh: number } } = {};

      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateString = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'EEE');
        processedData[dateString] = { date: dayLabel, office: 0, wfh: 0 };
      }

      attendanceData.forEach(record => {
        if (processedData[record.date]) {
          if (record.status === 'Clocked In' || record.clockInTime) {
            if (record.workMode === 'OFFICE') {
              processedData[record.date].office++;
            } else if (record.workMode === 'WFH') {
              processedData[record.date].wfh++;
            }
          }
        }
      });
      return Object.values(processedData);
    };
    
    async function fetchData() {
        try {
            const data = await api.getAttendanceForAll();
            setChartData(processAttendanceData(data));
        } catch (error) {
            console.error("Failed to fetch attendance data", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[300px] md:h-[400px] w-full" />;
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="px-4 py-6 sm:p-6">
        <CardTitle className="text-lg md:text-xl">Attendance Overview</CardTitle>
        <CardDescription className="text-xs md:text-sm">Last 7 days of team attendance</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={12}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                fontSize={12}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={false}
              />
              <Bar
                dataKey="office"
                fill="var(--color-office)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="wfh"
                fill="var(--color-wfh)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
