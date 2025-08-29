import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { PasswordRecord } from "@shared/schema";
import { Copy, Edit, Trash2, Eye, EyeOff, Info } from "lucide-react";

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
    <Card className="sm:p-4 hover:shadow-md transition-shadow" data-testid={`card-record-${record.id}`}>
      {/* Mobile header actions */}
      <div className="flex border-b items-center justify-end gap-1 sm:hidden p-2">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 h-8 w-8 border"
          onClick={() => onEdit(record)}
          data-testid={`button-edit-mobile-${record.id}`}
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 h-8 w-8 border text-destructive"
          onClick={() => onDelete(record)}
          data-testid={`button-delete-mobile-${record.id}`}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8 border"
              title="Info"
              data-testid={`button-info-mobile-${record.id}`}
            >
              <Info className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 text-xs">
            <div className="space-y-1">
              <div className="font-medium">Record info</div>
              <div className="flex justify-between"><span>Created</span><span>{formatDate(record.createdAt as any)}</span></div>
              <div className="flex justify-between"><span>Updated</span><span>{formatDate(record.updatedAt as any)}</span></div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Compact Layout */}
      <div className="space-y-2 sm:space-y-3 p-2 sm:p-0 pt-0">
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
              className="p-2 h-8 w-8 flex-shrink-0 border"
              title="Copy email"
              data-testid={`button-copy-email-${record.id}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Password Field - Compact */}
        <div className="space-y-0.5 sm:space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-sm break-all min-w-0" data-testid={`text-password-${record.id}`}>
              {showPassword ? record.password : "••••••••••••"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 h-8 w-8 flex-shrink-0 border"
              title="Show/hide password"
              data-testid={`button-toggle-password-${record.id}`}
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(record.password, "Password")}
              className="p-2 h-8 w-8 flex-shrink-0 border"
              title="Copy password"
              data-testid={`button-copy-password-${record.id}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Description Field - Compact (only if exists) */}
        {record.description && (
          <div className="space-y-0.5 sm:space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <div className="flex items-start space-x-2">
              <div className="flex-1 bg-muted rounded px-3 py-2 text-sm break-words min-w-0" data-testid={`text-description-${record.id}`}>
                {record.description}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(record.description!, "Description")}
                className="p-2 h-8 w-8 flex-shrink-0 mt-0 border"
                title="Copy description"
                data-testid={`button-copy-description-${record.id}`}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons & Metadata - Single Row */}
        <div className="hidden sm:flex items-center justify-between py-2 border-t border-border">
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
      
      {/* Record Metadata (desktop/tablet only) */}
      <div className="hidden sm:flex pt-4 border-t border-border justify-between items-center text-xs text-muted-foreground">
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
