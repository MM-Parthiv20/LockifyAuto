import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PasswordRecord } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PasswordRecord | null;
}

export function DeleteModal({ isOpen, onClose, record }: DeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!record) throw new Error("No record to delete");
      const res = await apiRequest("DELETE", `/api/records/${record.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      toast({
        title: "Record deleted",
        description: "Your password record has been deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete record",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm" data-testid="modal-delete">
        <div className="text-center space-y-4 py-4">
          <div className="bg-destructive/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <DialogHeader>
            <DialogTitle className="text-center" data-testid="text-delete-title">
              Delete Record
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-muted-foreground" data-testid="text-delete-message">
            Are you sure you want to delete this password record? This action cannot be undone.
          </p>
          
          {record && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium truncate" data-testid="text-delete-email">
                {record.email}
              </p>
              {record.description && (
                <p className="text-muted-foreground truncate" data-testid="text-delete-description">
                  {record.description}
                </p>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
