-- ============================================================
-- MERIDIAN Healthcare & Inventory Management System
-- Oracle PL/SQL Schema
-- ============================================================

-- Drop existing tables (reverse dependency order)
begin
   for t in (
      select table_name
        from user_tables
       order by table_name
   ) loop
      execute immediate 'DROP TABLE '
                        || t.table_name
                        || ' CASCADE CONSTRAINTS';
   end loop;
end;
/

-- Drop sequences
begin
   for s in (
      select sequence_name
        from user_sequences
   ) loop
      execute immediate 'DROP SEQUENCE ' || s.sequence_name;
   end loop;
end;
/

-- ============================================================
-- SEQUENCES
-- ============================================================
create sequence seq_users start with 1 increment by 1 nocache nocycle;
create sequence seq_patients start with 1 increment by 1 nocache nocycle;
create sequence seq_doctors start with 1 increment by 1 nocache nocycle;
create sequence seq_pharmacists start with 1 increment by 1 nocache nocycle;
create sequence seq_suppliers start with 1 increment by 1 nocache nocycle;
create sequence seq_medicines start with 1 increment by 1 nocache nocycle;
create sequence seq_appointments start with 1 increment by 1 nocache nocycle;
create sequence seq_prescriptions start with 1 increment by 1 nocache nocycle;
create sequence seq_presc_items start with 1 increment by 1 nocache nocycle;
create sequence seq_med_requests start with 1 increment by 1 nocache nocycle;
create sequence seq_supplies start with 1 increment by 1 nocache nocycle;
create sequence seq_sales start with 1 increment by 1 nocache nocycle;
create sequence seq_audit_logs start with 1 increment by 1 nocache nocycle;
create sequence seq_notifications start with 1 increment by 1 nocache nocycle;
create sequence seq_stock_hist start with 1 increment by 1 nocache nocycle;

-- ============================================================
-- TABLE: USERS (base authentication table)
-- ============================================================
create table users (
   user_id       number default seq_users.nextval primary key,
   username      varchar2(50) not null unique,
   email         varchar2(100) not null unique,
   password_hash varchar2(255) not null,
   role          varchar2(20) not null,
   is_active     number(1) default 1 not null,
   created_at    timestamp default current_timestamp not null,
   updated_at    timestamp default current_timestamp not null,
   last_login    timestamp,
   constraint chk_users_role
      check ( role in ( 'admin',
                        'doctor',
                        'pharmacist',
                        'supplier',
                        'patient' ) ),
   constraint chk_users_active check ( is_active in ( 0,
                                                      1 ) )
);

-- ============================================================
-- TABLE: PATIENTS
-- ============================================================
create table patients (
   patient_id        number default seq_patients.nextval primary key,
   user_id           number not null unique,
   first_name        varchar2(50) not null,
   last_name         varchar2(50) not null,
   date_of_birth     date not null,
   gender            varchar2(10) not null,
   blood_group       varchar2(5),
   phone             varchar2(20),
   address           varchar2(255),
   emergency_contact varchar2(100),
   emergency_phone   varchar2(20),
   created_at        timestamp default current_timestamp not null,
   updated_at        timestamp default current_timestamp not null,
   constraint fk_patients_user foreign key ( user_id )
      references users ( user_id )
         on delete cascade,
   constraint chk_patients_gender
      check ( gender in ( 'Male',
                          'Female',
                          'Other' ) ),
   constraint chk_patients_blood
      check ( blood_group in ( 'A+',
                               'A-',
                               'B+',
                               'B-',
                               'AB+',
                               'AB-',
                               'O+',
                               'O-' )
          or blood_group is null )
);

-- ============================================================
-- TABLE: DOCTORS
-- ============================================================
create table doctors (
   doctor_id        number default seq_doctors.nextval primary key,
   user_id          number not null unique,
   first_name       varchar2(50) not null,
   last_name        varchar2(50) not null,
   specialization   varchar2(100) not null,
   license_number   varchar2(50) not null unique,
   phone            varchar2(20),
   experience_years number(3) default 0,
   available_days   varchar2(100) default 'Mon,Tue,Wed,Thu,Fri',
   consultation_fee number(10,2) default 0,
   created_at       timestamp default current_timestamp not null,
   updated_at       timestamp default current_timestamp not null,
   constraint fk_doctors_user foreign key ( user_id )
      references users ( user_id )
         on delete cascade
);

-- ============================================================
-- TABLE: PHARMACISTS
-- ============================================================
create table pharmacists (
   pharmacist_id  number default seq_pharmacists.nextval primary key,
   user_id        number not null unique,
   first_name     varchar2(50) not null,
   last_name      varchar2(50) not null,
   license_number varchar2(50) not null unique,
   phone          varchar2(20),
   shift          varchar2(20) default 'Morning',
   created_at     timestamp default current_timestamp not null,
   updated_at     timestamp default current_timestamp not null,
   constraint fk_pharmacists_user foreign key ( user_id )
      references users ( user_id )
         on delete cascade,
   constraint chk_pharmacists_shift
      check ( shift in ( 'Morning',
                         'Afternoon',
                         'Night' ) )
);

-- ============================================================
-- TABLE: SUPPLIERS
-- ============================================================
create table suppliers (
   supplier_id    number default seq_suppliers.nextval primary key,
   user_id        number not null unique,
   company_name   varchar2(100) not null,
   contact_person varchar2(100),
   phone          varchar2(20),
   email          varchar2(100),
   address        varchar2(255),
   license_number varchar2(50) unique,
   rating         number(3,1) default 5.0,
   created_at     timestamp default current_timestamp not null,
   updated_at     timestamp default current_timestamp not null,
   constraint fk_suppliers_user foreign key ( user_id )
      references users ( user_id )
         on delete cascade,
   constraint chk_suppliers_rating check ( rating between 0 and 10 )
);

-- ============================================================
-- TABLE: MEDICINES (inventory)
-- ============================================================
create table medicines (
   medicine_id           number default seq_medicines.nextval primary key,
   name                  varchar2(100) not null,
   generic_name          varchar2(100),
   category              varchar2(50) not null,
   manufacturer          varchar2(100),
   unit_price            number(10,2) not null,
   stock_quantity        number(10) default 0 not null,
   reorder_level         number(10) default 10 not null,
   expiry_date           date,
   description           varchar2(500),
   dosage_form           varchar2(50),
   strength              varchar2(50),
   requires_prescription number(1) default 0,
   created_at            timestamp default current_timestamp not null,
   updated_at            timestamp default current_timestamp not null,
   constraint chk_medicines_stock check ( stock_quantity >= 0 ),
   constraint chk_medicines_price check ( unit_price >= 0 ),
   constraint chk_med_prescription check ( requires_prescription in ( 0,
                                                                      1 ) )
);

-- ============================================================
-- TABLE: APPOINTMENTS
-- ============================================================
create table appointments (
   appointment_id   number default seq_appointments.nextval primary key,
   patient_id       number not null,
   doctor_id        number not null,
   appointment_date date not null,
   appointment_time varchar2(10) not null,
   status           varchar2(20) default 'Scheduled' not null,
   reason           varchar2(500),
   notes            varchar2(1000),
   created_at       timestamp default current_timestamp not null,
   updated_at       timestamp default current_timestamp not null,
   constraint fk_appt_patient foreign key ( patient_id )
      references patients ( patient_id ),
   constraint fk_appt_doctor foreign key ( doctor_id )
      references doctors ( doctor_id ),
   constraint chk_appt_status
      check ( status in ( 'Scheduled',
                          'Completed',
                          'Cancelled',
                          'No-Show' ) )
);

-- ============================================================
-- TABLE: PRESCRIPTIONS
-- ============================================================
create table prescriptions (
   prescription_id number default seq_prescriptions.nextval primary key,
   appointment_id  number not null,
   patient_id      number not null,
   doctor_id       number not null,
   diagnosis       varchar2(1000) not null,
   notes           varchar2(1000),
   issued_date     date default sysdate not null,
   valid_until     date,
   status          varchar2(20) default 'Active' not null,
   created_at      timestamp default current_timestamp not null,
   constraint fk_presc_appt foreign key ( appointment_id )
      references appointments ( appointment_id ),
   constraint fk_presc_patient foreign key ( patient_id )
      references patients ( patient_id ),
   constraint fk_presc_doctor foreign key ( doctor_id )
      references doctors ( doctor_id ),
   constraint chk_presc_status
      check ( status in ( 'Active',
                          'Fulfilled',
                          'Completed',
                          'Expired',
                          'Cancelled' ) )
);

-- ============================================================
-- TABLE: PRESCRIPTION_ITEMS (medicines in prescription)
-- ============================================================
create table prescription_items (
   item_id         number default seq_presc_items.nextval primary key,
   prescription_id number not null,
   medicine_id     number not null,
   quantity        number(5) not null,
   dosage          varchar2(100),
   frequency       varchar2(100),
   duration_days   number(5),
   instructions    varchar2(500),
   constraint fk_pi_prescription foreign key ( prescription_id )
      references prescriptions ( prescription_id ),
   constraint fk_pi_medicine foreign key ( medicine_id )
      references medicines ( medicine_id ),
   constraint chk_pi_quantity check ( quantity > 0 )
);

-- ============================================================
-- TABLE: MEDICINE_REQUESTS (doctor requests medicine from pharmacist/supplier)
-- ============================================================
create table medicine_requests (
   request_id         number default seq_med_requests.nextval primary key,
   requested_by       number not null,  -- doctor user_id or pharmacist user_id
   request_type       varchar2(20) default 'Internal',  -- Internal (pharmacist), External (supplier)
   medicine_id        number,
   medicine_name      varchar2(100),
   quantity_requested number(10) not null,
   priority           varchar2(20) default 'Normal',
   reason             varchar2(500),
   status             varchar2(20) default 'Pending',
   responded_by       number,
   response_notes     varchar2(500),
   created_at         timestamp default current_timestamp not null,
   updated_at         timestamp default current_timestamp not null,
   constraint fk_mr_requested_by foreign key ( requested_by )
      references users ( user_id ),
   constraint fk_mr_medicine foreign key ( medicine_id )
      references medicines ( medicine_id ),
   constraint fk_mr_responded_by foreign key ( responded_by )
      references users ( user_id ),
   constraint chk_mr_priority
      check ( priority in ( 'Low',
                            'Normal',
                            'High',
                            'Urgent' ) ),
   constraint chk_mr_status
      check ( status in ( 'Pending',
                          'Approved',
                          'Rejected',
                          'Fulfilled' ) )
);

-- ============================================================
-- TABLE: SUPPLY_ORDERS (supplier fulfils medicine_requests)
-- ============================================================
create table supply_orders (
   supply_id     number default seq_supplies.nextval primary key,
   request_id    number,
   supplier_id   number not null,
   medicine_id   number not null,
   quantity      number(10) not null,
   unit_cost     number(10,2),
   total_cost    number(12,2),
   batch_number  varchar2(50),
   expiry_date   date,
   supplied_date date default sysdate,
   status        varchar2(20) default 'Pending',
   notes         varchar2(500),
   created_at    timestamp default current_timestamp not null,
   constraint fk_so_request foreign key ( request_id )
      references medicine_requests ( request_id ),
   constraint fk_so_supplier foreign key ( supplier_id )
      references suppliers ( supplier_id ),
   constraint fk_so_medicine foreign key ( medicine_id )
      references medicines ( medicine_id ),
   constraint chk_so_status
      check ( status in ( 'Pending',
                          'Shipped',
                          'Delivered',
                          'Cancelled' ) )
);

-- ============================================================
-- TABLE: SALES (pharmacist issues medicine to patient)
-- ============================================================
create table sales (
   sale_id         number default seq_sales.nextval primary key,
   pharmacist_id   number not null,
   patient_id      number,
   prescription_id number,
   total_amount    number(12,2) default 0,
   payment_method  varchar2(20) default 'Cash',
   sale_date       date default sysdate not null,
   notes           varchar2(500),
   created_at      timestamp default current_timestamp not null,
   constraint fk_sale_pharmacist foreign key ( pharmacist_id )
      references pharmacists ( pharmacist_id ),
   constraint fk_sale_patient foreign key ( patient_id )
      references patients ( patient_id ),
   constraint fk_sale_prescription foreign key ( prescription_id )
      references prescriptions ( prescription_id ),
   constraint chk_sale_payment
      check ( payment_method in ( 'Cash',
                                  'Card',
                                  'Insurance',
                                  'Online' ) )
);

-- ============================================================
-- TABLE: SALE_ITEMS
-- ============================================================
create table sale_items (
   sale_item_id number primary key,
   sale_id      number not null,
   medicine_id  number not null,
   quantity     number(5) not null,
   unit_price   number(10,2) not null,
   subtotal     number(12,2) not null,
   constraint fk_si_sale foreign key ( sale_id )
      references sales ( sale_id ),
   constraint fk_si_medicine foreign key ( medicine_id )
      references medicines ( medicine_id ),
   constraint chk_si_qty check ( quantity > 0 )
);

create sequence seq_sale_items start with 1 increment by 1 nocache nocycle;
alter table sale_items modify
   sale_item_id default seq_sale_items.nextval;

-- ============================================================
-- TABLE: STOCK_HISTORY (audit stock changes)
-- ============================================================
create table stock_history (
   history_id      number default seq_stock_hist.nextval primary key,
   medicine_id     number not null,
   changed_by      number not null,
   change_type     varchar2(20) not null,  -- 'Add','Remove','Sale','Supply','Adjust'
   quantity_before number(10) not null,
   quantity_change number(10) not null,  -- positive=add, negative=remove
   quantity_after  number(10) not null,
   reason          varchar2(500),
   changed_at      timestamp default current_timestamp not null,
   constraint fk_sh_medicine foreign key ( medicine_id )
      references medicines ( medicine_id ),
   constraint fk_sh_user foreign key ( changed_by )
      references users ( user_id ),
   constraint chk_sh_type
      check ( change_type in ( 'Add',
                               'Remove',
                               'Sale',
                               'Supply',
                               'Adjust' ) )
);

-- ============================================================
-- TABLE: NOTIFICATIONS
-- ============================================================
create table notifications (
   notification_id number default seq_notifications.nextval primary key,
   user_id         number not null,
   title           varchar2(200) not null,
   message         varchar2(1000) not null,
   type            varchar2(30) default 'Info',
   is_read         number(1) default 0,
   created_at      timestamp default current_timestamp not null,
   constraint fk_notif_user foreign key ( user_id )
      references users ( user_id ),
   constraint chk_notif_type
      check ( type in ( 'Info',
                        'Warning',
                        'Alert',
                        'Success',
                        'Appointment',
                        'Prescription',
                        'Stock' ) ),
   constraint chk_notif_read check ( is_read in ( 0,
                                                  1 ) )
);

-- ============================================================
-- TABLE: AUDIT_LOGS
-- ============================================================
create table audit_logs (
   log_id     number default seq_audit_logs.nextval primary key,
   user_id    number,
   action     varchar2(100) not null,
   table_name varchar2(50),
   record_id  number,
   old_value  clob,
   new_value  clob,
   ip_address varchar2(50),
   created_at timestamp default current_timestamp not null,
   constraint fk_audit_user foreign key ( user_id )
      references users ( user_id )
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_appointments_patient on
   appointments (
      patient_id
   );
create index idx_appointments_doctor on
   appointments (
      doctor_id
   );
create index idx_appointments_date on
   appointments (
      appointment_date
   );
create index idx_appointments_status on
   appointments (
      status
   );
create index idx_prescriptions_patient on
   prescriptions (
      patient_id
   );
create index idx_prescriptions_doctor on
   prescriptions (
      doctor_id
   );
create index idx_medicines_category on
   medicines (
      category
   );
create index idx_medicines_expiry on
   medicines (
      expiry_date
   );
create index idx_medicines_stock on
   medicines (
      stock_quantity
   );
create index idx_sales_date on
   sales (
      sale_date
   );
create index idx_sales_pharmacist on
   sales (
      pharmacist_id
   );
create index idx_notifications_user on
   notifications (
      user_id,
      is_read
   );
create index idx_audit_user on
   audit_logs (
      user_id
   );
create index idx_audit_table on
   audit_logs (
      table_name,
      record_id
   );

commit;