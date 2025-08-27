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
    <Card className="password-card p-3 sm:p-4 hover:shadow-md transition-shadow" data-testid={`card-record-${record.id}`}>
      {/* Compact Layout */}
      <div className="space-y-3">
        {/* Email Field - Compact */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-sm break-all min-w-0" data-testid={`text-email-${record.id}`}>
              {record.email}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(record.email, "Email")}
              className="p-2 h-8 w-8 flex-shrink-0"
              title="Copy email"
              data-testid={`button-copy-email-${record.id}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Password Field - Compact */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-sm break-all min-w-0" data-testid={`text-password-${record.id}`}>
              {showPassword ? record.password : "••••••••••••"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 h-8 w-8 flex-shrink-0"
              title="Show/hide password"
              data-testid={`button-toggle-password-${record.id}`}
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(record.password, "Password")}
              className="p-2 h-8 w-8 flex-shrink-0"
              title="Copy password"
              data-testid={`button-copy-password-${record.id}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Description Field - Compact (only if exists) */}
        {record.description && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <div className="flex items-start space-x-2">
              <div className="flex-1 bg-muted rounded px-3 py-2 text-sm break-words min-w-0" data-testid={`text-description-${record.id}`}>
                {record.description}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(record.description!, "Description")}
                className="p-2 h-8 w-8 flex-shrink-0 mt-0"
                title="Copy description"
                data-testid={`button-copy-description-${record.id}`}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons & Metadata - Single Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <span data-testid={`text-created-${record.id}`}>
              {formatDate(record.createdAt)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEdit(record)}
              data-testid={`button-edit-${record.id}`}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onDelete(record)}
              data-testid={`button-delete-${record.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
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
