"use client";

import type React from "react";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface EditProfileFormProps {
  profile: Profile;
}

// Podržani tipovi fajlova
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Maksimalna veličina fajla (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function EditProfileForm({ profile }: EditProfileFormProps): React.JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState<string>(profile.display_name);
  const [bio, setBio] = useState<string>(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  // Handler za promjenu fajla
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validacija tipa fajla
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }

    // Validacija veličine fajla
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be less than 5MB.");
      return;
    }

    setAvatarFile(file);
    setError(null);
    setShowUrlInput(false); // Sakrij URL input ako uploadujemo fajl

    // Kreiranje preview URL-a
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handler za unos URL-a
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const url = e.target.value;
    setAvatarUrl(url);
    setAvatarPreview(url);
    setAvatarFile(null); // Resetuj fajl ako unosimo URL
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handler za brisanje slike
  const handleRemoveAvatar = (): void => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl("");
    setShowUrlInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload slike u Supabase Storage
  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const supabase = createClient();

      // Generiše unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload fajla
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Dobij public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();
      let finalAvatarUrl = avatarUrl;

      // Upload novog avatara ako postoji
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          throw new Error("Failed to upload avatar");
        }
      }

      // Ažuriranje profila
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio || null,
          avatar_url: finalAvatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      router.push(`/profile/${profile.username}`);
      router.refresh();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    router.push(`/profile/${profile.username}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Avatar section */}
      <div className="space-y-2">
        <Label htmlFor="avatar">Profile Picture</Label>
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={avatarPreview || undefined} alt={displayName} />
              <AvatarFallback className="text-xl">
                {displayName[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Upload dugme */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || saving}
                className="relative"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  onChange={handleFileChange}
                  disabled={uploading || saving}
                />
              </Button>

              {/* Dugme za URL (ne input) */}
              {!showUrlInput ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(true)}
                  disabled={uploading || saving}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Enter URL
                </Button>
              ) : (
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <Input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={handleUrlChange}
                    disabled={uploading || saving}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUrlInput(false)}
                    disabled={uploading || saving}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {avatarPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploading || saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                Upload an image (max 5MB, JPEG, PNG, WebP, GIF) or enter URL
              </p>
              {avatarFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Username (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          type="text" 
          value={profile.username} 
          readOnly 
          disabled 
        />
        <p className="text-muted-foreground text-xs">Username cannot be changed</p>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          type="text"
          placeholder="John Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          disabled={saving || uploading}
          minLength={2}
          maxLength={50}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          disabled={saving || uploading}
          maxLength={160}
        />
        <p className="text-muted-foreground text-xs">{bio.length}/160 characters</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={saving || uploading}
        >
          {(saving || uploading) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploading ? "Uploading..." : "Saving..."}
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving || uploading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}