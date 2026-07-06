export const ME = `
  query Me {
    me {
      kodeku
      username
      pegawai {
        kode
        nama
        kodejabatan
        kodedivisi
        jabatan { kode nama }
        divisi { kode nama }
      }
    }
  }
`

export const LOGIN = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        kodeku
        username
        pegawai {
          kode
          nama
          kodejabatan
          kodedivisi
          jabatan { kode nama }
          divisi { kode nama }
        }
      }
    }
  }
`

export const GET_TASKS = `
  query GetTasks {
    tasks {
      id title description status createdAt updatedAt
      comments { id content userKode createdAt }
      meta { id key value }
    }
  }
`

export const CREATE_TASK = `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id title description status createdAt updatedAt
    }
  }
`

export const UPDATE_TASK = `
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id title description status updatedAt
    }
  }
`

export const DELETE_TASK = `
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`

export const ADD_COMMENT = `
  mutation AddComment($taskId: ID!, $content: String!) {
    addTaskComment(taskId: $taskId, content: $content) {
      id content userKode createdAt
    }
  }
`

export const SET_META = `
  mutation SetMeta($taskId: ID!, $key: String!, $value: String) {
    setTaskMeta(taskId: $taskId, key: $key, value: $value) {
      id key value
    }
  }
`
