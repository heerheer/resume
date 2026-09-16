"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { PersonalInfoItem, PersonalInfoSection, PersonalInfoLayout } from "@/types/resume";
import { createNewPersonalInfoItem } from "@/lib/utils";
import IconPicker from "./icon-picker";

interface PersonalInfoEditorProps {
  personalInfoSection: PersonalInfoSection;
  avatar?: string;
  onUpdate: (personalInfoSection: PersonalInfoSection, avatar?: string) => void;
}

/**
 * 个人信息编辑器组件
 */
export default function PersonalInfoEditor({
  personalInfoSection,
  avatar,
  onUpdate,
}: PersonalInfoEditorProps) {
  const avatarUrl = avatar || "";
  const showLabels = personalInfoSection?.showPersonalInfoLabels !== false;
  const layout: PersonalInfoLayout = personalInfoSection?.layout ?? { mode: 'grid', itemsPerRow: 2 };
  const avatarType = personalInfoSection?.avatarType === "idPhoto" ? "idPhoto" : "default";
  const isIdPhoto = avatarType === "idPhoto";
  const avatarShape = isIdPhoto ? "square" : (personalInfoSection?.avatarShape === "square" ? "square" : "circle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 提取personalInfo到局部变量以简化代码，如果personalInfoSection不存在则使用空数组
  const personalInfo = personalInfoSection?.personalInfo || [];

  /**
   * 处理拖拽排序结束事件
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const source = result.source;
    const destination = result.destination;

    if (source.index === destination.index) return;

    const sortedPersonalInfo = [...personalInfo]
      .sort((a, b) => a.order - b.order);

    const [movedItem] = sortedPersonalInfo.splice(source.index, 1);
    sortedPersonalInfo.splice(destination.index, 0, movedItem);

    // 更新order字段
    const updatedPersonalInfo = sortedPersonalInfo.map((item, index) => ({
      ...item,
      order: index
    }));

    onUpdate({
      ...personalInfoSection,
      personalInfo: updatedPersonalInfo
    }, avatarUrl);
  };

  /**
   * 切换标签显示
   */
  const toggleShowLabels = () => {
    if (!personalInfoSection) return;
    const newShowLabels = !showLabels;
    onUpdate({
      ...personalInfoSection,
      showPersonalInfoLabels: newShowLabels
    });
  };

  /**
   * 切换布局模式
   */
  const toggleLayoutMode = () => {
    if (!personalInfoSection) return;
    const newMode = layout.mode === 'inline' ? 'grid' : 'inline';
    const newLayout: PersonalInfoLayout = { ...layout, mode: newMode as 'inline' | 'grid' };
    onUpdate({
      ...personalInfoSection,
      layout: newLayout
    });
  };

  /**
   * 切换头像显示风格（圆形 / 方形）
   */
  const toggleAvatarShape = () => {
    if (!personalInfoSection || isIdPhoto) return;
    const newShape = avatarShape === "circle" ? "square" : "circle";
    onUpdate({
      ...personalInfoSection,
      avatarShape: newShape,
    });
  };

  const handleAvatarTypeChange = (value: "default" | "idPhoto") => {
    if (!personalInfoSection) return;
    const nextShape = value === "idPhoto"
      ? "square"
      : (personalInfoSection.avatarShape === "square" ? "square" : "circle");
    onUpdate({
      ...personalInfoSection,
      avatarType: value,
      avatarShape: nextShape,
    });
  };

  /**
   * 设置每行列数
   */
  const handleItemsPerRowChange = (itemsPerRow: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!personalInfoSection) return;
    const newLayout: PersonalInfoLayout = {
      ...layout,
      mode: 'grid',
      itemsPerRow
    };
    onUpdate({
      ...personalInfoSection,
      layout: newLayout
    });
  };



  useEffect(() => {
    if (!avatar) return;
    // avatarUrl is derived from props; no local setState
  }, [avatar]);

  useEffect(() => {
    // 同步 personalInfoSection 的变化，更新本地状态
    if (personalInfoSection) {
      // showLabels derived from props

      // 更新layout状态
      if (personalInfoSection.layout) {
        // layout derived from props
      }
    }
  }, [personalInfoSection]);

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!personalInfoSection) return;
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onUpdate({
          ...personalInfoSection,
          personalInfo: personalInfo
        }, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * 更新个人信息项
   */
  const updatePersonalInfoItem = (
    id: string,
    updates: Partial<PersonalInfoItem>
  ) => {
    if (!personalInfoSection) return;
    const updatedInfo = personalInfo.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate({
      ...personalInfoSection,
      personalInfo: updatedInfo
    }, avatarUrl);
  };

  /**
   * 添加新的个人信息项
   */
  const addPersonalInfoItem = () => {
    if (!personalInfoSection) return;
    const newItem = createNewPersonalInfoItem();
    onUpdate({
      ...personalInfoSection,
      personalInfo: [...personalInfo, newItem]
    }, avatarUrl);
  };

  /**
   * 删除个人信息项
   */
  const removePersonalInfoItem = (id: string) => {
    if (!personalInfoSection) return;
    const updatedInfo = personalInfo.filter((item) => item.id !== id);

    // 如果删除后，当前列数大于剩余项目数，自动调整列数
    const maxCols = Math.max(Math.min(6, updatedInfo.length), 1);
    const currentCols = layout.itemsPerRow || 2;
    let newLayout = { ...layout };

    if (currentCols > maxCols) {
      newLayout = {
        ...layout,
        itemsPerRow: maxCols as 1 | 2 | 3 | 4 | 5 | 6
      };
    }

    onUpdate({
      ...personalInfoSection,
      personalInfo: updatedInfo,
      layout: newLayout
    }, avatarUrl);
  };

  /**
   * 处理头像URL变化
   */
  const handleAvatarChange = (url: string) => {
    if (!personalInfoSection) return;
    onUpdate(personalInfoSection, url);
  };

  return (
    <Card className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:account-circle" className="w-5 h-5 text-primary" />
          <h2 className="section-title">个人信息</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={avatarType}
            onValueChange={(value) => handleAvatarTypeChange(value as "default" | "idPhoto")}
          >
            <SelectTrigger className="h-9 w-28">
              <SelectValue placeholder="头像类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">普通头像</SelectItem>
              <SelectItem value="idPhoto">一寸照片</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleAvatarShape}
            className="gap-2 bg-transparent"
            disabled={isIdPhoto}
          >
            <Icon
              icon={avatarShape === "circle" ? "mdi:checkbox-blank-circle-outline" : "mdi:checkbox-blank-outline"}
              className="w-4 h-4"
            />
            {avatarShape === "circle" ? "圆形头像" : "方形头像"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleLayoutMode}
            className="gap-2 bg-transparent"
          >
            <Icon icon={layout.mode === 'inline' ? "mdi:view-column" : "mdi:view-sequential"} className="w-4 h-4" />
            {layout.mode === 'inline' ? "单行显示" : "多行显示"}
          </Button>

          {/* 每行列数选择器 - 只在grid模式下显示 */}
          {layout.mode === 'grid' && (
            <>
              <Select
                value={String(layout.itemsPerRow || 2)}
                onValueChange={(value) => handleItemsPerRowChange(Number(value) as 1 | 2 | 3 | 4 | 5 | 6)}
              >
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => {
                    const maxCols = Math.max(Math.min(6, personalInfo.length), 1);
                    if (num > maxCols) return null;
                    return (
                      <SelectItem key={num} value={String(num)}>
                        {num}列
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={toggleShowLabels}
            className="gap-2 bg-transparent"
          >
            <Icon icon={showLabels ? "mdi:eye-off" : "mdi:eye"} className="w-4 h-4" />
            {showLabels ? "隐藏标签" : "显示标签"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={addPersonalInfoItem}
            className="gap-2 bg-transparent"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            添加信息
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 头像设置 */}
        <div className="form-group">
          <Label className="form-label">头像</Label>
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:cursor-pointer hover:border-primary ${avatarShape === "square" ? "rounded-none" : "rounded-full"}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="头像预览"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon
                  icon="mdi:account"
                  className="w-8 h-8 text-muted-foreground"
                />
              )}
            </div>
            <div className="flex-1">
              <Input
                value={avatarUrl}
                onChange={(e) => handleAvatarChange(e.target.value)}
                placeholder="请输入头像图片URL或点击头像上传"
                className="mb-2 placeholder:text-gray-400 border border-border"
              />
              <p className="text-xs text-gray-400 pl-3">
                {isIdPhoto ? "一寸照片模式：固定方形显示，不支持圆形头像。" : "建议使用1:1比例的图片"}
              </p>
            </div>
          </div>
        </div>

        {/* 个人信息项列表 */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="personal-info-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {personalInfo
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                        >
                          <div className="flex-1">
                            <PersonalInfoItemEditor
                              item={item}
                              onUpdate={(updates) => updatePersonalInfoItem(item.id, updates)}
                              onRemove={() => removePersonalInfoItem(item.id)}
                              dragHandleProps={provided.dragHandleProps}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {personalInfo.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Icon
              icon="mdi:information-outline"
              className="w-8 h-8 mx-auto mb-2 opacity-50"
            />
            <p className="text-sm">暂无个人信息，点击“添加信息”开始编辑</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </Card>
  );
}

/**
 * 个人信息项编辑器
 */
interface PersonalInfoItemEditorProps {
  item: PersonalInfoItem;
  onUpdate: (updates: Partial<PersonalInfoItem>) => void;
  onRemove: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
}

function PersonalInfoItemEditor({
  item,
  onUpdate,
  onRemove,
  dragHandleProps,
  isDragging,
}: PersonalInfoItemEditorProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="flex items-start gap-2 p-2 border rounded-lg bg-muted/30">
      {/* 图标选择 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="icon-button-personal-info bg-transparent w-8 h-8 p-0 flex items-center justify-center flex-shrink-0"
          >
            {item.icon && (
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                className="text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择图标</DialogTitle>
          </DialogHeader>
          <IconPicker
            selectedIcon={item.icon}
            onSelect={(icon) => onUpdate({ icon })}
          />
        </DialogContent>
      </Dialog>

      {/* 单行布局：标签 | 类型 | 值输入 | 删除 | 拖拽手柄（窄屏自动换行） */}
      <div className="flex-1 flex flex-wrap items-end gap-2 min-w-0">
        {/* 标签 */}
        <div className="flex-[0_0_auto] min-w-[80px] max-w-[120px]">
          <div className="h-8 flex flex-col justify-end">
            <Input
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="标签"
              className="h-8 placeholder:text-gray-400 text-sm"
            />
          </div>
        </div>

        {/* 类型选择 */}
        <div className="flex-[0_0_auto] w-[60px]">
          <div className="h-8 flex flex-col justify-end">
            <Select
              value={item.value.type || "text"}
              onValueChange={(value: "text" | "link") => onUpdate({ value: { ...item.value, type: value } })}
            >
              <SelectTrigger className="h-8 py-0 px-2 text-xs border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">文本</SelectItem>
                <SelectItem value="link">链接</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 值输入 */}
        <div className="flex-1 min-w-0">
          {item.value.type === "link" ? (
            <div className="flex gap-1 h-8">
              <div className="flex-1 h-8 flex flex-col justify-end min-w-0">
                <Input
                  value={item.value.content}
                  onChange={(e) => onUpdate({ value: { ...item.value, content: e.target.value } })}
                  placeholder="链接地址"
                  className="h-8 w-full placeholder:text-gray-400 text-sm"
                />
              </div>
              <div className="flex-1 h-8 flex flex-col justify-end min-w-0">
                <Input
                  value={item.value.title || ""}
                  onChange={(e) => onUpdate({ value: { ...item.value, title: e.target.value } })}
                  placeholder="显示标题"
                  className="h-8 w-full placeholder:text-gray-400 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="h-8 flex flex-col justify-end">
              <Input
                value={item.value.content}
                onChange={(e) => onUpdate({ value: { ...item.value, content: e.target.value } })}
                placeholder="内容"
                className="h-8 w-full placeholder:text-gray-400 text-sm"
              />
            </div>
          )}
        </div>

        {/* 删除按钮和拖拽手柄组 */}
        <div className="flex items-center gap-1 flex-[0_0_auto]">
          {/* 删除按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="icon-button text-destructive hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
          >
            <Icon icon="mdi:delete" className="w-4 h-4" />
          </Button>

          {/* 拖拽手柄 */}
          <div
            {...dragHandleProps}
            className={`flex items-center justify-center w-8 h-8 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 ${isDragging ? 'text-foreground' : ''}`}
          >
            <Icon icon="mdi:drag" className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个个人信息项吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
