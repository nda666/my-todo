package models

import "time"

type MasterUser struct {
	Kodeku          string         `gorm:"column:kodeku;primaryKey"`
	Usernameku      string         `gorm:"column:usernameku"`
	Passwordku      string         `gorm:"column:passwordku"`
	UserKodePegawai int            `gorm:"column:userkodepegawai"`
	Pegawai         *MasterPegawai `gorm:"foreignKey:UserKodePegawai;references:Kode"`
}

func (MasterUser) TableName() string {
	return "masteruser"
}

type MasterPegawai struct {
	Kode        int            `gorm:"column:kode;primaryKey"`
	Nama        string         `gorm:"column:nama"`
	KodeJabatan int            `gorm:"column:kodejabatan"`
	KodeDivisi  int            `gorm:"column:kodedivisi"`
	Jabatan     *MasterJabatan `gorm:"foreignKey:KodeJabatan;references:Kode"`
	Divisi      *MasterDivisi  `gorm:"foreignKey:KodeDivisi;references:Kode"`
}

func (MasterPegawai) TableName() string {
	return "masterpegawai"
}

type MasterJabatan struct {
	Kode int    `gorm:"column:kode;primaryKey"`
	Nama string `gorm:"column:nama"`
}

func (MasterJabatan) TableName() string {
	return "masterjabatan"
}

type MasterDivisi struct {
	Kode int    `gorm:"column:kode;primaryKey"`
	Nama string `gorm:"column:nama"`
}

func (MasterDivisi) TableName() string {
	return "masterdivisi"
}

type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
)

type Task struct {
	ID          uint         `gorm:"primaryKey"`
	Title       string       `gorm:"size:255;not null"`
	Description string       `gorm:"type:text"`
	Status      TaskStatus   `gorm:"size:20;default:pending;not null"`
	UserKode    string       `gorm:"column:user_kode;size:50;not null;index"`
	CreatedAt   time.Time    `gorm:"autoCreateTime"`
	UpdatedAt   time.Time    `gorm:"autoUpdateTime"`
	Comments    []TaskComment `gorm:"foreignKey:TaskID"`
	Meta        []TaskMeta    `gorm:"foreignKey:TaskID"`
}

func (Task) TableName() string {
	return "xv_task"
}

type TaskComment struct {
	ID        uint      `gorm:"primaryKey"`
	TaskID    uint      `gorm:"not null;index"`
	UserKode  string    `gorm:"column:user_kode;size:50;not null"`
	Content   string    `gorm:"type:text;not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (TaskComment) TableName() string {
	return "xv_task_comment"
}

type TaskMeta struct {
	ID     uint   `gorm:"primaryKey"`
	TaskID uint   `gorm:"not null;index"`
	Key    string `gorm:"size:100;not null"`
	Value  string `gorm:"type:text"`
}

func (TaskMeta) TableName() string {
	return "xv_task_meta"
}
