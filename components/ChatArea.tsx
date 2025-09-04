"use client";

import { MessageList } from "./MessageList";

interface FileAttachment {
  type: "file";
  mediaType: string;
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  isEditing?: boolean;
  attachments?: FileAttachment[];
  metadata?: {
    model?: string;
    tokens?: number;
    imageGenerated?: boolean;
    regenerated?: boolean;
    editHistory?: Array<{
      content: string;
      timestamp: Date;
    }>;
  };
}

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isGeneratingImage: boolean;
  isTemporaryChat: boolean;
  isSignedIn: boolean;
  inputValue: string;
  editingMessageId: string | null;
  editContent: string;
  isEditingSave: boolean;
  copiedMessageId: string | null;
  likedMessages: Set<string>;
  dislikedMessages: Set<string>;
  isSavingToMongoDB: boolean;
  generatingImageMessageIds: Set<string>;
  generatedImages: { [messageId: string]: { url: string; publicId: string } };
  failedMessageIds: Set<string>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditMessage: (messageId: string, content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onCopyToClipboard: (text: string, messageId: string) => void;
  onEditContentChange: (content: string) => void;
  onLikeMessage: (messageId: string) => void;
  onDislikeMessage: (messageId: string) => void;
  onSetImage: (image: string | null) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onFileDialogOpen: () => void;
}

export function ChatArea(props: ChatAreaProps) {
  return (
    <MessageList
      messages={props.messages}
      isLoading={props.isLoading}
      isStreaming={props.isStreaming}
      isGeneratingImage={props.isGeneratingImage}
      isTemporaryChat={props.isTemporaryChat}
      isSignedIn={props.isSignedIn}
      inputValue={props.inputValue}
      editingMessageId={props.editingMessageId}
      editContent={props.editContent}
      isEditingSave={props.isEditingSave}
      copiedMessageId={props.copiedMessageId}
      likedMessages={props.likedMessages}
      dislikedMessages={props.dislikedMessages}
      isSavingToMongoDB={props.isSavingToMongoDB}
      generatingImageMessageIds={props.generatingImageMessageIds}
      generatedImages={props.generatedImages}
      failedMessageIds={props.failedMessageIds}
      textareaRef={props.textareaRef}
      onEditMessage={props.onEditMessage}
      onSaveEdit={props.onSaveEdit}
      onCancelEdit={props.onCancelEdit}
      onCopyToClipboard={props.onCopyToClipboard}
      onEditContentChange={props.onEditContentChange}
      onLikeMessage={props.onLikeMessage}
      onDislikeMessage={props.onDislikeMessage}
      onSetImage={props.onSetImage}
      onInputChange={props.onInputChange}
      onKeyDown={props.onKeyDown}
      onSendMessage={props.onSendMessage}
      onStopGeneration={props.onStopGeneration}
      onFileDialogOpen={props.onFileDialogOpen}
    />
  );
}