# Vibration Implementation Guide

This guide shows where and how to add haptic feedback throughout your app.

## 📦 Import the Vibration Module

```typescript
import { Vibration, VibrateIfEnabled } from '@/lib/vibration';
```

---

## 🎯 Implementation Examples

### 1. **Copy to Clipboard** (Password Record Card)
**Location**: `client/src/components/password-record-card.tsx`

```typescript
// In the copyToClipboard function, add vibration after successful copy:

const copyToClipboard = async (text: string, fieldName: string) => {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
    } else {
      // ... fallback code ...
    }
    
    // ✅ ADD VIBRATION HERE
    VibrateIfEnabled.short(); // Quick tap feedback
    
    toast({ title: "Copied to clipboard", description: `${fieldName} has been copied` });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

### 2. **Record Created** (Record Modal)
**Location**: `client/src/components/record-modal.tsx`

```typescript
// In createMutation.onSuccess:

onSuccess: (created: PasswordRecord) => {
  onClose();
  const current = queryClient.getQueryData<PasswordRecord[]>(["/api/records"]) || [];
  queryClient.setQueryData(["/api/records"], [created, ...current]);
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.success(); // Success pattern
  
  toast({
    title: "Record created",
    description: "Your password record has been saved successfully",
  });
  // ... rest of code ...
}
```

---

### 3. **Record Updated** (Record Modal)
**Location**: `client/src/components/record-modal.tsx`

```typescript
// In updateMutation.onSuccess:

onSuccess: (updated: PasswordRecord) => {
  // ... update cache ...
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.medium(); // Medium feedback
  
  toast({
    title: "Record updated",
    description: "Your password record has been updated successfully",
  });
  onClose();
}
```

---

### 4. **Record Deleted** (Delete Modal)
**Location**: `client/src/components/delete-modal.tsx`

```typescript
// In deleteMutation.onSuccess:

onSuccess: (updated: PasswordRecord) => {
  // ... update cache ...
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.long(); // Longer vibration for destructive action
  
  toast({
    title: "Moved to Trash",
  });
  void history.add({ type: "record:delete", summary: `Moved to Trash: ${record?.email}` }).catch(() => {});
  onClose();
}
```

---

### 5. **Toggle Star** (Dashboard)
**Location**: `client/src/pages/dashboard.tsx`

```typescript
// In toggleStarMutation:

const toggleStarMutation = useMutation({
  mutationFn: async (r: PasswordRecord) => {
    await apiRequest("PUT", `/api/records/${r.id}`, { starred: !r.starred });
    
    // ✅ ADD VIBRATION HERE
    VibrateIfEnabled.light(); // Light tap
    
    return { id: r.id, starred: !r.starred };
  },
  // ... rest of mutation ...
});
```

---

### 6. **Login Success** (Auth)
**Location**: `client/src/lib/auth.ts`

```typescript
// In loginMutation.onSuccess:

onSuccess: (user) => {
  setLoggedIn(user);
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.success(); // Success pattern
  
  void history.add({ type: 'login', summary: `Logged in as ${user.username}` }).catch(() => {});
}
```

---

### 7. **Register Success** (Auth)
**Location**: `client/src/lib/auth.ts`

```typescript
// In registerMutation.onSuccess:

onSuccess: (user) => {
  setLoggedIn(user);
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.success(); // Success pattern with celebration
  
  void history.add({ type: 'register', summary: `Registered new user ${user.username}` }).catch(() => {});
}
```

---

### 8. **Password Generated** (Password Generator)
**Location**: `client/src/components/password-generator.tsx`

```typescript
// In the generate password function:

const generatePassword = () => {
  // ... password generation logic ...
  setPassword(newPassword);
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.short(); // Quick feedback
};
```

---

### 9. **Record Restored** (Dashboard Trash)
**Location**: `client/src/pages/dashboard.tsx`

```typescript
// In restore button onClick:

onClick={async () => {
  await apiRequest("PUT", `/api/records/${r.id}`, { isDeleted: false, deletedAt: null });
  queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.doubleTap(); // Double tap for restore
  
  void history.add({ type: "record: restore", summary: `Restored: ${r.email}` }).catch(() => {});
}}
```

---

### 10. **Permanent Delete** (Dashboard Trash)
**Location**: `client/src/pages/dashboard.tsx`

```typescript
// In permanent delete button onClick:

onClick={async () => {
  await apiRequest("DELETE", `/api/records/${r.id}`);
  queryClientRQ.invalidateQueries({ queryKey: ["/api/records"] });
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.long(); // Strong vibration for permanent action
  
  void history.add({ type: "record: delete", summary: `Permanently deleted: ${r.email}` }).catch(() => {});
}}
```

---

### 11. **Error Handling** (Record Modal)
**Location**: `client/src/components/record-modal.tsx`

```typescript
// In mutation.onError:

onError: (error: any) => {
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.error(); // Error pattern
  
  toast({
    title: "Failed to create record",
    description: error.message || "Please check your input and try again",
    variant: "destructive",
  });
}
```

---

### 12. **Theme Toggle** (Dashboard/Profile)
**Location**: Any theme toggle button

```typescript
onClick={() => {
  setTheme(theme === "light" ? "dark" : "light");
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.light(); // Subtle feedback
}}
```

---

### 13. **Tour Step Completion** (Dashboard)
**Location**: `client/src/pages/dashboard.tsx`

```typescript
// In intro.js onafterchange callback:

intro.onafterchange(() => {
  injectSkipButton();
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.light(); // Light tap on each step
});

// On tour complete:
intro.oncomplete(async () => {
  await markComplete();
  
  // ✅ ADD VIBRATION HERE
  VibrateIfEnabled.tripleTap(); // Celebration!
  
  // ... rest of code ...
});
```

---

### 14. **Confetti Celebration** (First Record Created)
**Location**: `client/src/pages/dashboard.tsx`

```typescript
// In RecordModal onCreateSuccess callback:

onCreateSuccess={async () => {
  if (wasEmptyBeforeAddRef.current) {
    // ✅ ADD VIBRATION HERE
    VibrateIfEnabled.tripleTap(); // Triple tap with confetti!
    
    try {
      const mod = await import("canvas-confetti");
      const confetti = mod.default;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      // ... more confetti ...
    } catch {}
  }
}}
```

---

## 🎛️ User Settings (Optional)

Add vibration toggle in Profile Settings:

**Location**: `client/src/pages/profile.tsx`

```typescript
import { VibrationPreference, Vibration } from '@/lib/vibration';

// Add this in your settings section:

<div className="flex items-center justify-between">
  <div>
    <h3 className="font-medium">Haptic Feedback</h3>
    <p className="text-sm text-muted-foreground">
      Enable vibration for actions
    </p>
  </div>
  <Switch
    checked={VibrationPreference.isEnabled()}
    onCheckedChange={(checked) => {
      VibrationPreference.setEnabled(checked);
      if (checked) {
        Vibration.short(); // Test vibration
      }
      toast({
        title: checked ? "Vibration enabled" : "Vibration disabled",
      });
    }}
  />
</div>
```

---

## 📊 Summary Table

| **Event** | **Pattern** | **Duration** | **When to Use** |
|-----------|-------------|--------------|-----------------|
| Copy | `short()` | 50ms | Copy password/email |
| Create | `success()` | [50,30,50] | Record created |
| Update | `medium()` | 100ms | Record updated |
| Delete | `long()` | 200ms | Move to trash |
| Star Toggle | `light()` | 10ms | Toggle favorite |
| Login Success | `success()` | [50,30,50] | Login complete |
| Register | `success()` | [50,30,50] | Account created |
| Password Gen | `short()` | 50ms | Password generated |
| Restore | `doubleTap()` | [50,50,50] | Item restored |
| Permanent Delete | `long()` | 200ms | Irreversible action |
| Error | `error()` | [100,50,100,50,100] | Operation failed |
| Tour Step | `light()` | 10ms | Onboarding progress |
| Celebration | `tripleTap()` | [30,30,30,30,30] | Achievement |

---

## 🚀 Quick Start

1. Import the vibration utility:
   ```typescript
   import { VibrateIfEnabled } from '@/lib/vibration';
   ```

2. Add to your success handlers:
   ```typescript
   VibrateIfEnabled.success(); // For major actions
   VibrateIfEnabled.short();   // For quick actions
   ```

3. Add to error handlers:
   ```typescript
   VibrateIfEnabled.error(); // For errors
   ```

---

## ⚠️ Best Practices

1. **Don't Overuse** - Only add vibration to meaningful actions
2. **Keep it Short** - Most vibrations should be < 100ms
3. **Respect Preferences** - Always use `VibrateIfEnabled` wrapper
4. **Test on Mobile** - Vibration only works on mobile devices
5. **Provide Toggle** - Let users disable vibration if they want

---

## 🧪 Testing

Test vibration on:
- ✅ Android devices (Chrome, Firefox)
- ✅ iOS devices (Safari only)
- ⚠️ Desktop browsers (will be ignored)

**Note**: iOS only supports vibration in Safari, not in Chrome or other browsers.

---

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome (Android) | ✅ Full |
| Firefox (Android) | ✅ Full |
| Safari (iOS) | ✅ Full |
| Chrome (iOS) | ❌ No |
| Desktop Browsers | ❌ No (safely ignored) |

