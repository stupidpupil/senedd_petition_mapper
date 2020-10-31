library(statswalesr)
library(tidyverse)

constituency_counts <- statswales_get_dataset("popu2004")

constituency_counts %>% 
  filter(
    Date_Code == "2019-12-01", 
    Measure_ItemName_ENG== "Total electors", 
    Area_Code %>% str_detect("^W09")) %>% 
  select(Area_Code, Area_ItemName_ENG, Data) %>% 
  rename(ConstituencyCode = Area_Code, ConstituencyNameEN = Area_ItemName_ENG, Electors2019 = Data) %>%
  mutate(
    ConstituencyNameEN = ConstituencyNameEN %>% str_replace("South Pembrokeshire", "South Pembs.")
  ) %>%
  write_csv("data/2019_electors.csv")