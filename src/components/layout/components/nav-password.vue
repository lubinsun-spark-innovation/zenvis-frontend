<template>
  <n-modal
    :show="visible"
    preset="card"
    title="修改密码"
    class="password-modal"
    :style="modalStyle"
    content-style="overflow: auto"
    :mask-closable="false"
    :z-index="4000"
    @update:show="handleVisibleChange"
  >
    <p class="password-modal__hint">密码修改成功后将退出当前登录，请使用新密码重新登录。</p>
    <el-form
      ref="formRef"
      :model="formPassword"
      name="change-password"
      autocomplete="off"
      label-position="top"
    >
      <el-form-item label="原密码" prop="old_password" :rules="formRules.old_password">
        <el-input
          class="login-input"
          type="password"
          placeholder="请输入原密码"
          v-model="formPassword.old_password"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      <el-form-item label="新密码" prop="password" :rules="formRules.password">
        <el-input
          class="login-input"
          type="password"
          placeholder="8～16 位，包含大小写字母、数字和 @!#$"
          v-model="formPassword.password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      <el-form-item label="新密码确认" prop="password_copy" :rules="formRules.password_copy">
        <el-input
          class="login-input"
          type="password"
          placeholder="请再次输入新密码"
          v-model="formPassword.password_copy"
          autocomplete="new-password"
          show-password
          @keyup.enter="handleOk"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="password-modal__actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleOk">确认修改</el-button>
      </div>
    </template>
  </n-modal>
</template>
<script setup lang="ts">
  import { reactive, ref, watch } from "vue";
  import type { FormInstance } from 'element-plus';
  import { NModal } from 'naive-ui';
  import { rules } from '@u/tool';
  interface IUserFrom {
    old_password: string;
    password: string;
    password_copy: string;
  }
  const props = defineProps({
    show: {
      type: Boolean,
      default: false
    }
  });
  const emit = defineEmits({
    'on-ok': null,
    'on-cancel': null,
  });
  let visible = ref<boolean>(false)
  const formRef = ref<FormInstance>();
  let formPassword = reactive<IUserFrom>({
    old_password: '',
    password: '',
    password_copy: ''
  });
  const modalStyle = {
    width: 'min(520px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 32px)',
  };
  const newPass = (rule: any, value: string, callback: any) => {
    if (value) {
      if (!rules.passwordRule(value)) {
        callback(new Error('请输入8~16位由大小写英文、数字、@!#$组成的密码！'));
      } else {
        callback();
      }
    } else if (value === '') {
      callback(new Error('请输入密码'));
    } else {
      callback();
    }
  };
  const reNewPass = (rule: any, value: string, callback: any) => {
    if (value) {
      if (value === formPassword.password) {
        callback();
      } else {
        callback(new Error('两次输入密码不一致!'));
      }
    } else if (value === '') {
      callback(new Error('请输入密码'));
    } else {
      callback();
    }
  };
  const formRules = reactive({
    old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
    password: [{ required: true, validator: newPass, trigger: 'blur' }],
    password_copy: [{ required: true, validator: reNewPass, trigger: 'blur' }],
  });
  watch(
    () => props.show,
    (newVal) => {
      visible.value = newVal;
      if (formRef.value) {
        formRef.value.resetFields();
      }
    }
  );
  const handleCancel = () => {
    if (formRef.value) {
      formRef.value.resetFields();
    }
    emit('on-cancel');
  };
  const handleVisibleChange = (value: boolean) => {
    if (!value) handleCancel();
  };
  const handleOk = () => {
    formRef.value?.validate((valid: boolean) => {
      if (valid) {
        const { password_copy, ...data } = formPassword;
        emit('on-ok', data);
      }
    });
  };
</script>

<style scoped lang="scss">
  .password-modal__hint {
    padding: 10px 12px;
    margin-bottom: 18px;
    color: var(--zv-text-secondary);
    font-size: 13px;
    line-height: 1.6;
    background: var(--zv-bg-subtle);
    border: 1px solid var(--zv-divider);
    border-radius: 10px;
  }

  .password-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    font-weight: 600;
    color: var(--zv-text);
  }

  @media (max-width: 640px) {
    .password-modal__actions > :deep(.el-button) {
      flex: 1;
    }
  }
</style>
