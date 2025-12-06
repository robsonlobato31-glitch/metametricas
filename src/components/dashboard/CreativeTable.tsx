import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Image, MessageSquare } from 'lucide-react';

interface CreativeData {
    id: string;
    name: string;
    budget: number;
    messages: number;
    cost_per_message: number;
    spend: number;
    ctr: number;
    cpm: number;
}

interface CreativeTableProps {
    creatives: CreativeData[];
}

export const CreativeTable: React.FC<CreativeTableProps> = ({ creatives }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <Image size={16} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Criativos Destaques</h2>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="border-dark-border">
                        <TableRow className="border-dark-border hover:bg-transparent">
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold">Ad Name</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Orçamento</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Msgs</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Custo/Msg</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Gasto</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">CTR</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">CPM</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {creatives.map((creative) => (
                            <TableRow key={creative.id} className="border-dark-border hover:bg-dark-bg/50 transition-colors">
                                <TableCell className="font-medium text-gray-300 text-xs py-3">
                                    <span className="truncate max-w-[150px] block">{creative.name}</span>
                                </TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(creative.budget || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">{creative.messages}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(creative.cost_per_message || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(creative.spend || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">{(creative.ctr || 0).toFixed(2)}%</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(creative.cpm || 0).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        {creatives.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                    Nenhum criativo encontrado
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
