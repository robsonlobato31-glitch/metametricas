import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link2 } from 'lucide-react';

interface UTMData {
    source: string;
    purchases: number;
    checkouts: number;
    revenue: number;
}

interface UTMTableProps {
    utm: UTMData[];
}

export const UTMTable: React.FC<UTMTableProps> = ({ utm }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <Link2 size={16} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Rastreio de UTM</h2>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="border-dark-border">
                        <TableRow className="border-dark-border hover:bg-transparent">
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold">Origem da sessão</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-center">Compras</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-center">Finalizações de compra</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Receita de compra</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {utm.map((item, idx) => (
                            <TableRow key={idx} className="border-dark-border hover:bg-dark-bg/50 transition-colors">
                                <TableCell className="font-medium text-gray-300 text-xs py-3">
                                    {item.source}
                                </TableCell>
                                <TableCell className="text-center text-gray-300 text-xs py-3">{item.purchases}</TableCell>
                                <TableCell className="text-center text-gray-300 text-xs py-3">{item.checkouts}</TableCell>
                                <TableCell className="text-right text-brand-400 font-bold text-xs py-3">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {utm.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                    Nenhum dado de UTM encontrado
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
