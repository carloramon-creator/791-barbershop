
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderOpen, Upload, Trash2, FileText, Download, Loader2, Calendar } from "lucide-react";
import { User } from "@/lib/types";
import { supabaseClient } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-provider";
import { format } from "date-fns";

interface UserFilesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
}

interface UserDocument {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    content_type: string;
    created_at: string;
}

export function UserFilesDialog({ open, onOpenChange, user }: UserFilesDialogProps) {
    const { tenant } = useAuth();
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (open && user) {
            fetchDocuments();
        }
    }, [open, user]);

    const fetchDocuments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabaseClient
                .from('user_documents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !tenant) return;

        setUploading(true);
        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('barber-documents') // Standardized bucket name
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Save metadata to Database
            const { error: dbError } = await supabaseClient
                .from('user_documents')
                .insert({
                    tenant_id: tenant.id,
                    user_id: user.id,
                    file_name: file.name,
                    file_path: fileName,
                    file_size: file.size,
                    content_type: file.type
                });

            if (dbError) throw dbError;

            fetchDocuments();
            alert("Arquivo enviado com sucesso!");

        } catch (err: any) {
            console.error("Upload error:", err);
            alert("Erro ao enviar arquivo: " + err.message);
        } finally {
            setUploading(false);
            // Clear input
            e.target.value = '';
        }
    };

    const handleDownload = async (doc: UserDocument) => {
        try {
            const { data, error } = await supabaseClient.storage
                .from('barber-documents')
                .createSignedUrl(doc.file_path, 60); // Link valid for 60s

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err: any) {
            alert("Erro ao baixar: " + err.message);
        }
    };

    const handleDelete = async (docId: string, filePath: string) => {
        if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;

        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabaseClient.storage
                .from('barber-documents')
                .remove([filePath]);

            if (storageError) console.error("Storage delete error", storageError);

            // 2. Delete from Database
            const { error: dbError } = await supabaseClient
                .from('user_documents')
                .delete()
                .eq('id', docId);

            if (dbError) throw dbError;

            fetchDocuments();
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-500" />
                        Arquivos de {user?.name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Contratos assinados e documentos pessoais.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* List Documents */}
                    <div className="bg-slate-950/50 rounded-lg border border-slate-800 min-h-[200px] max-h-[300px] overflow-y-auto p-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <Loader2 className="animate-spin mr-2" /> Carregando...
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                                <FolderOpen size={32} className="mb-2 opacity-20" />
                                <p>Nenhum arquivo encontrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-md group transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-slate-800 rounded text-blue-400">
                                                <FileText size={16} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-slate-200 truncate">{doc.file_name}</p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <Calendar size={10} /> {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                                                    <span className="mx-1">•</span>
                                                    {(doc.file_size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => handleDownload(doc)}>
                                                <Download size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(doc.id, doc.file_path)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex justify-end">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                {uploading ? 'Enviando...' : 'Enviar Arquivo'}
                            </div>
                        </label>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
