import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, MousePointer, Link } from 'lucide-react';

interface CampaignData {
    id: string;
    name: string;
    budget: number;
    messages: number;
    cost_per_message: number;
    spend: number;
    ctr: number;
    cpm: number;
}

interface CampaignTableProps {
    data: CampaignData[];
}

export const CampaignTable: React.FC<CampaignTableProps> = ({ data }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-100 text-sm">Visão Geral</h2>
                <div className="flex gap-2">
                    {/* Icons/Actions could go here */}
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="border-dark-border">
                        <TableRow className="border-dark-border hover:bg-transparent">
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold">Campanha</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Orçamento</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Mensagens</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Custo/Msg</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">Gasto</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">CTR</TableHead>
                            <TableHead className="text-gray-500 text-[10px] uppercase font-bold text-right">CPM</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data && data.length > 0 ? data.map((campaign) => (
                            <TableRow key={campaign.id || Math.random()} className="border-dark-border hover:bg-dark-bg/50 transition-colors">
                                <TableCell className="font-medium text-gray-300 text-xs py-3">
                                    <div className="flex flex-col">
                                        <span className="truncate max-w-[150px]">{campaign.name || 'Sem nome'}</span>
                                        <span className="text-[10px] text-gray-600">ID: {campaign.id ? campaign.id.substring(0, 8) : 'N/A'}...</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(campaign.budget || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">{campaign.messages || 0}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(campaign.cost_per_message || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(campaign.spend || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">{(campaign.ctr || 0).toFixed(2)}%</TableCell>
                                <TableCell className="text-right text-gray-300 text-xs py-3">R$ {(campaign.cpm || 0).toFixed(2)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                    Nenhuma campanha encontrada
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
