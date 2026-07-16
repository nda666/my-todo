package repository

import (
	"context"
	"errors"
	"time"

	"golang-todo/internal/models"

	"gorm.io/gorm"
)

type TaskQueryOptions struct {
	UserKode   *string // scope ke satu orang
	UserKodeIn []string
	DivisiKode *int // scope ke satu divisi (dipakai kalau UserKode nil)
	CursorID   uint
	Limit      int
}

type TaskRepository interface {
	FindPaginated(ctx context.Context, opts TaskQueryOptions) ([]models.Task, error)
	FindByID(ctx context.Context, id uint) (*models.Task, error)
	FindOwned(ctx context.Context, id uint, kodeku string) (*models.Task, error) // milik sendiri ATAU dibuat sendiri (leader)
	FindByUserKodesInRange(ctx context.Context, userKodes []string, from, to time.Time) ([]models.Task, error)
	FindByProjectID(ctx context.Context, projectID uint, cursorID uint, limit int) ([]models.Task, error)

	Create(ctx context.Context, task *models.Task) error
	Save(ctx context.Context, task *models.Task) error
	Delete(ctx context.Context, id uint, kodeku string) (bool, error)
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func withTaskPreloads(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Comments", "parent_id IS NULL").
		Preload("Comments.Replies").
		Preload("Comments.Replies.Reactions").
		Preload("Comments.Replies.Attachments").
		Preload("Comments.Reactions").
		Preload("Comments.Attachments").
		Preload("Meta", func(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC") })
}

func (r *taskRepository) FindPaginated(ctx context.Context, opts TaskQueryOptions) ([]models.Task, error) {
	query := r.db.WithContext(ctx).Model(&models.Task{})

	switch {
	case opts.UserKode != nil:
		query = query.Where("user_kode = ?", *opts.UserKode)
	case len(opts.UserKodeIn) > 0:
		query = query.Where("user_kode IN ?", opts.UserKodeIn)
	}

	if opts.CursorID > 0 {
		query = query.Where("id < ?", opts.CursorID)
	}

	var tasks []models.Task
	err := withTaskPreloads(query).
		Order("id DESC").
		Limit(opts.Limit + 1).
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) FindByID(ctx context.Context, id uint) (*models.Task, error) {
	var task models.Task
	err := withTaskPreloads(r.db.WithContext(ctx)).First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) FindOwned(ctx context.Context, id uint, kodeku string) (*models.Task, error) {
	var task models.Task
	err := r.db.WithContext(ctx).
		Where("id = ? AND (user_kode = ? OR created_by = ?)", id, kodeku, kodeku).
		First(&task).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("task not found")
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) Create(ctx context.Context, task *models.Task) error {
	return r.db.WithContext(ctx).Create(task).Error
}

func (r *taskRepository) Save(ctx context.Context, task *models.Task) error {
	return r.db.WithContext(ctx).Save(task).Error
}

func (r *taskRepository) Delete(ctx context.Context, id uint, kodeku string) (bool, error) {
	result := r.db.WithContext(ctx).
		Where("id = ? AND (user_kode = ? OR created_by = ?)", id, kodeku, kodeku).
		Delete(&models.Task{})
	return result.RowsAffected > 0, result.Error
}

func (r *taskRepository) FindByUserKodesInRange(ctx context.Context, userKodes []string, from, to time.Time) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Where("user_kode IN ? AND created_at BETWEEN ? AND ?", userKodes, from, to).
		Order("user_kode ASC, created_at ASC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) FindByProjectID(ctx context.Context, projectID uint, cursorID uint, limit int) ([]models.Task, error) {
	query := r.db.WithContext(ctx).
		Joins("JOIN xv_project_task pt ON pt.task_id = xv_task.id").
		Where("pt.project_id = ?", projectID)
	if cursorID > 0 {
		query = query.Where("xv_task.id < ?", cursorID)
	}
	var tasks []models.Task
	err := withTaskPreloads(query).Order("xv_task.id DESC").Limit(limit).Find(&tasks).Error
	return tasks, err
}
