package graph

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"golang-todo/internal/auth"
	"golang-todo/internal/models"

	"github.com/graphql-go/graphql"
	"gorm.io/gorm"
)

type Schema struct {
	Schema graphql.Schema
}

func NewSchema(db *gorm.DB, authService *auth.Service) (*Schema, error) {
	taskStatusEnum := graphql.NewEnum(graphql.EnumConfig{
		Name: "TaskStatus",
		Values: graphql.EnumValueConfigMap{
			"PENDING":     &graphql.EnumValueConfig{Value: models.TaskStatusPending},
			"IN_PROGRESS": &graphql.EnumValueConfig{Value: models.TaskStatusInProgress},
			"COMPLETED":   &graphql.EnumValueConfig{Value: models.TaskStatusCompleted},
		},
	})

	jabatanType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Jabatan",
		Fields: graphql.Fields{
			"kode": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
			"nama": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		},
	})

	divisiType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Divisi",
		Fields: graphql.Fields{
			"kode": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
			"nama": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		},
	})

	pegawaiType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Pegawai",
		Fields: graphql.Fields{
			"kode":        &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
			"nama":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"kodejabatan": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
			"kodedivisi":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
			"jabatan":     &graphql.Field{Type: jabatanType},
			"divisi":      &graphql.Field{Type: divisiType},
		},
	})

	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"kodeku":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"username": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"pegawai":  &graphql.Field{Type: pegawaiType},
		},
	})

	taskMetaType := graphql.NewObject(graphql.ObjectConfig{
		Name: "TaskMeta",
		Fields: graphql.Fields{
			"id":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
			"key":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"value": &graphql.Field{Type: graphql.String},
		},
	})

	taskCommentType := graphql.NewObject(graphql.ObjectConfig{
		Name: "TaskComment",
		Fields: graphql.Fields{
			"id":        &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
			"content":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"userKode":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		},
	})

	taskType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Task",
		Fields: graphql.FieldsThunk(func() graphql.Fields {
			return graphql.Fields{
				"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
				"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
				"description": &graphql.Field{Type: graphql.String},
				"status":      &graphql.Field{Type: graphql.NewNonNull(taskStatusEnum)},
				"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
				"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
				"comments": &graphql.Field{
					Type: graphql.NewList(graphql.NewNonNull(taskCommentType)),
				},
				"meta": &graphql.Field{
					Type: graphql.NewList(graphql.NewNonNull(taskMetaType)),
				},
			}
		}),
	})

	authPayloadType := graphql.NewObject(graphql.ObjectConfig{
		Name: "AuthPayload",
		Fields: graphql.Fields{
			"token": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"user":  &graphql.Field{Type: graphql.NewNonNull(userType)},
		},
	})

	createTaskInput := graphql.NewInputObject(graphql.InputObjectConfig{
		Name: "CreateTaskInput",
		Fields: graphql.InputObjectConfigFieldMap{
			"title":       &graphql.InputObjectFieldConfig{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.InputObjectFieldConfig{Type: graphql.String},
			"status":      &graphql.InputObjectFieldConfig{Type: taskStatusEnum},
		},
	})

	updateTaskInput := graphql.NewInputObject(graphql.InputObjectConfig{
		Name: "UpdateTaskInput",
		Fields: graphql.InputObjectConfigFieldMap{
			"title":       &graphql.InputObjectFieldConfig{Type: graphql.String},
			"description": &graphql.InputObjectFieldConfig{Type: graphql.String},
			"status":      &graphql.InputObjectFieldConfig{Type: taskStatusEnum},
		},
	})

	rootQuery := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"me": &graphql.Field{
				Type: userType,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, nil
					}
					var user models.MasterUser
					if err := db.Preload("Pegawai.Jabatan").
						Preload("Pegawai.Divisi").
						Where("kodeku = ?", claims.Kodeku).
						First(&user).Error; err != nil {
						return nil, nil
					}
					return formatUser(user), nil
				},
			},
			"tasks": &graphql.Field{
				Type: graphql.NewList(graphql.NewNonNull(taskType)),
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					var tasks []models.Task
					if err := db.Where("user_kode = ?", claims.Kodeku).
						Preload("Comments").
						Preload("Meta").
						Order("created_at DESC").
						Find(&tasks).Error; err != nil {
						return nil, err
					}
					return formatTasks(tasks), nil
				},
			},
			"task": &graphql.Field{
				Type: taskType,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					id, err := parseID(p.Args["id"])
					if err != nil {
						return nil, err
					}
					var task models.Task
					if err := db.Where("id = ? AND user_kode = ?", id, claims.Kodeku).
						Preload("Comments").
						Preload("Meta").
						First(&task).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							return nil, nil
						}
						return nil, err
					}
					return formatTask(task), nil
				},
			},
		},
	})

	rootMutation := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"login": &graphql.Field{
				Type: authPayloadType,
				Args: graphql.FieldConfigArgument{
					"username": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"password": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					username := p.Args["username"].(string)
					password := p.Args["password"].(string)
					token, user, err := authService.Login(username, password)
					if err != nil {
						return nil, err
					}
					db.Preload("Pegawai.Jabatan").Preload("Pegawai.Divisi").First(user, "kodeku = ?", user.Kodeku)
					return map[string]interface{}{
						"token": token,
						"user":  formatUser(*user),
					}, nil
				},
			},
			"createTask": &graphql.Field{
				Type: taskType,
				Args: graphql.FieldConfigArgument{
					"input": &graphql.ArgumentConfig{Type: graphql.NewNonNull(createTaskInput)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					input := p.Args["input"].(map[string]interface{})
					task := models.Task{
						Title:       input["title"].(string),
						Description: strVal(input["description"]),
						Status:      models.TaskStatusPending,
						UserKode:    claims.Kodeku,
					}
					if status, ok := input["status"]; ok && status != nil {
						task.Status = status.(models.TaskStatus)
					}
					if err := db.Create(&task).Error; err != nil {
						return nil, err
					}
					return formatTask(task), nil
				},
			},
			"updateTask": &graphql.Field{
				Type: taskType,
				Args: graphql.FieldConfigArgument{
					"id":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
					"input": &graphql.ArgumentConfig{Type: graphql.NewNonNull(updateTaskInput)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					id, err := parseID(p.Args["id"])
					if err != nil {
						return nil, err
					}
					var task models.Task
					if err := db.Where("id = ? AND user_kode = ?", id, claims.Kodeku).First(&task).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							return nil, errors.New("task not found")
						}
						return nil, err
					}
					input := p.Args["input"].(map[string]interface{})
					if v, ok := input["title"]; ok && v != nil {
						task.Title = v.(string)
					}
					if v, ok := input["description"]; ok {
						task.Description = strVal(v)
					}
					if v, ok := input["status"]; ok && v != nil {
						task.Status = v.(models.TaskStatus)
					}
					if err := db.Save(&task).Error; err != nil {
						return nil, err
					}
					db.Preload("Comments").Preload("Meta").First(&task, task.ID)
					return formatTask(task), nil
				},
			},
			"deleteTask": &graphql.Field{
				Type: graphql.Boolean,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					id, err := parseID(p.Args["id"])
					if err != nil {
						return nil, err
					}
					result := db.Where("id = ? AND user_kode = ?", id, claims.Kodeku).Delete(&models.Task{})
					if result.Error != nil {
						return nil, result.Error
					}
					return result.RowsAffected > 0, nil
				},
			},
			"addTaskComment": &graphql.Field{
				Type: taskCommentType,
				Args: graphql.FieldConfigArgument{
					"taskId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
					"content": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					taskID, err := parseID(p.Args["taskId"])
					if err != nil {
						return nil, err
					}
					var task models.Task
					if err := db.Where("id = ? AND user_kode = ?", taskID, claims.Kodeku).First(&task).Error; err != nil {
						return nil, errors.New("task not found")
					}
					comment := models.TaskComment{
						TaskID:   taskID,
						UserKode: claims.Kodeku,
						Content:  p.Args["content"].(string),
					}
					if err := db.Create(&comment).Error; err != nil {
						return nil, err
					}
					return formatComment(comment), nil
				},
			},
			"setTaskMeta": &graphql.Field{
				Type: taskMetaType,
				Args: graphql.FieldConfigArgument{
					"taskId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
					"key":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"value":  &graphql.ArgumentConfig{Type: graphql.String},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					taskID, err := parseID(p.Args["taskId"])
					if err != nil {
						return nil, err
					}
					var task models.Task
					if err := db.Where("id = ? AND user_kode = ?", taskID, claims.Kodeku).First(&task).Error; err != nil {
						return nil, errors.New("task not found")
					}
					key := p.Args["key"].(string)
					value := strVal(p.Args["value"])
					var meta models.TaskMeta
					err = db.Where("task_id = ? AND `key` = ?", taskID, key).First(&meta).Error
					if errors.Is(err, gorm.ErrRecordNotFound) {
						meta = models.TaskMeta{TaskID: taskID, Key: key, Value: value}
						if err := db.Create(&meta).Error; err != nil {
							return nil, err
						}
					} else if err != nil {
						return nil, err
					} else {
						meta.Value = value
						if err := db.Save(&meta).Error; err != nil {
							return nil, err
						}
					}
					return formatMeta(meta), nil
				},
			},
			"deleteTaskMeta": &graphql.Field{
				Type: graphql.Boolean,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					claims, err := auth.RequireUser(p.Context)
					if err != nil {
						return nil, err
					}
					id, err := parseID(p.Args["id"])
					if err != nil {
						return nil, err
					}
					var meta models.TaskMeta
					if err := db.Joins("JOIN xv_task ON xv_task.id = xv_task_meta.task_id").
						Where("xv_task_meta.id = ? AND xv_task.user_kode = ?", id, claims.Kodeku).
						First(&meta).Error; err != nil {
						return false, nil
					}
					result := db.Delete(&meta)
					return result.RowsAffected > 0, result.Error
				},
			},
		},
	})

	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    rootQuery,
		Mutation: rootMutation,
	})
	if err != nil {
		return nil, fmt.Errorf("create schema: %w", err)
	}

	return &Schema{Schema: schema}, nil
}

func parseID(v interface{}) (uint, error) {
	switch id := v.(type) {
	case string:
		n, err := strconv.ParseUint(id, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid id")
		}
		return uint(n), nil
	case int:
		return uint(id), nil
	default:
		return 0, fmt.Errorf("invalid id")
	}
}

func strVal(v interface{}) string {
	if v == nil {
		return ""
	}
	return v.(string)
}

func formatTime(t time.Time) string {
	return t.Format(time.RFC3339)
}

func formatTask(task models.Task) map[string]interface{} {
	comments := make([]map[string]interface{}, len(task.Comments))
	for i, c := range task.Comments {
		comments[i] = formatComment(c)
	}
	meta := make([]map[string]interface{}, len(task.Meta))
	for i, m := range task.Meta {
		meta[i] = formatMeta(m)
	}
	return map[string]interface{}{
		"id":          strconv.FormatUint(uint64(task.ID), 10),
		"title":       task.Title,
		"description": task.Description,
		"status":      task.Status,
		"createdAt":   formatTime(task.CreatedAt),
		"updatedAt":   formatTime(task.UpdatedAt),
		"comments":    comments,
		"meta":        meta,
	}
}

func formatTasks(tasks []models.Task) []map[string]interface{} {
	result := make([]map[string]interface{}, len(tasks))
	for i, t := range tasks {
		result[i] = formatTask(t)
	}
	return result
}

func formatComment(c models.TaskComment) map[string]interface{} {
	return map[string]interface{}{
		"id":        strconv.FormatUint(uint64(c.ID), 10),
		"content":   c.Content,
		"userKode":  c.UserKode,
		"createdAt": formatTime(c.CreatedAt),
	}
}

func formatMeta(m models.TaskMeta) map[string]interface{} {
	return map[string]interface{}{
		"id":    strconv.FormatUint(uint64(m.ID), 10),
		"key":   m.Key,
		"value": m.Value,
	}
}

func formatUser(user models.MasterUser) map[string]interface{} {
	var peg map[string]interface{}
	if user.Pegawai != nil {
		var jab map[string]interface{}
		if user.Pegawai.Jabatan != nil {
			jab = map[string]interface{}{
				"kode": user.Pegawai.Jabatan.Kode,
				"nama": user.Pegawai.Jabatan.Nama,
			}
		}
		var div map[string]interface{}
		if user.Pegawai.Divisi != nil {
			div = map[string]interface{}{
				"kode": user.Pegawai.Divisi.Kode,
				"nama": user.Pegawai.Divisi.Nama,
			}
		}
		peg = map[string]interface{}{
			"kode":        user.Pegawai.Kode,
			"nama":        user.Pegawai.Nama,
			"kodejabatan": user.Pegawai.KodeJabatan,
			"kodedivisi":  user.Pegawai.KodeDivisi,
			"jabatan":     jab,
			"divisi":      div,
		}
	}
	return map[string]interface{}{
		"kodeku":   user.Kodeku,
		"username": user.Usernameku,
		"pegawai":  peg,
	}
}
