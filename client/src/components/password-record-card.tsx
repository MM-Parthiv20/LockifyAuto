import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PasswordRecord } from "@shared/schema";
import { Copy, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface PasswordRecordCardProps {
  record: PasswordRecord;
  onEdit: (record: PasswordRecord) => void;
  onDelete: (record: PasswordRecord) => void;
}

export function PasswordRecordCard({ record, onEdit, onDelete }: PasswordRecordCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${fieldName} has been copied to your clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow" data-testid={`card-record-${record.id}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Record Info */}
        <div className="flex-1 space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm" data-testid={`text-email-${record.id}`}>
                {record.email}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(record.email, "Email")}
                className="px-2 py-2"
                title="Copy email"
                data-testid={`button-copy-email-${record.id}`}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm" data-testid={`text-password-${record.id}`}>
                {showPassword ? record.password : "••••••••••••"}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="px-2 py-2"
                title="Show/hide password"
                data-testid={`button-toggle-password-${record.id}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(record.password, "Password")}
                className="px-2 py-2"
                title="Copy password"
                data-testid={`button-copy-password-${record.id}`}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Description Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-sm" data-testid={`text-description-${record.id}`}>
                {record.description || "No description"}
              </div>
              {record.description && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(record.description!, "Description")}
                  className="px-2 py-2"
                  title="Copy description"
                  data-testid={`button-copy-description-${record.id}`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex lg:flex-col gap-2">
          <Button
            variant="outline"
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2"
            onClick={() => onEdit(record)}
            data-testid={`button-edit-${record.id}`}
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="destructive"
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2"
            onClick={() => onDelete(record)}
            data-testid={`button-delete-${record.id}`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
      
      {/* Record Metadata */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
        <span data-testid={`text-created-${record.id}`}>
          Created: {formatDate(record.createdAt)}
        </span>
        <span data-testid={`text-updated-${record.id}`}>
          Updated: {formatDate(record.updatedAt)}
        </span>
      </div>
    </Card>
  );
}
