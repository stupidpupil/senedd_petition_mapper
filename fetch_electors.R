library(statswalesr)
library(tidyverse)

constituency_counts <- statswales_get_dataset("popu2004")

constituency_counts %>% 
  filter(
    Date_Code == "2019-12-01", 
    Measure_ItemName_ENG== "Total electors", 
    Area_Code %>% str_detect("^W09")) %>% 
  select(Area_Code, Area_ItemName_ENG, Data) %>% 
  rename(ConstituencyCode = Area_Code, Electors2019 = Data) %>%
  left_join(read_csv("data/constituencies.csv")) %>%
  write_csv("data/2019_electors.csv")